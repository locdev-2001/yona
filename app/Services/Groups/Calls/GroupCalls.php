<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\CallActionRejected;
use App\Jobs\Calls\ExpireGroupCallJob;
use App\Models\Call;
use App\Models\CallInvitation;
use App\Models\User;
use App\Models\YonaGroup;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\CallJoin;
use App\Services\Calls\CallMedia;
use App\Services\Calls\CallService;
use App\Services\Calls\CallStatus;
use App\Services\Calls\InvitationStatus;
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\ParticipantIdentity;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Cuộc gọi nhóm có đổ chuông, dựng trên lõi cuộc gọi. Thành viên nào cũng gọi được: nhóm chưa có
// cuộc đang diễn ra thì mở cuộc mới và đổ chuông mọi thành viên khác, có rồi thì vào cuộc đó. Mỗi
// thành viên một lời mời (CallInvitation) với trạng thái riêng: đang đổ, đã nghe, từ chối, nhỡ;
// người đã nhỡ hay từ chối vẫn tự vào sau được và thành "đã nghe". Đời cuộc gọi: ringing → active
// khi người đầu tiên nghe; còn đổ mà không ai nghe thì missed, người gọi bỏ đi thì cancelled;
// active kết thúc khi người cuối cùng rời, một người rời không kết thúc cuộc gọi.
final readonly class GroupCalls
{
    private const LIVE_STATUSES = [CallStatus::Ringing, CallStatus::Active];

    public function __construct(
        private CallService $calls,
        private GroupCallSignals $signals,
    ) {}

    public function join(YonaGroup $group, User $user, CallMedia $media): CallJoin
    {
        $attendee = CallAttendee::user($user);
        $admission = $this->calls->admit($this->draftCallOf($group), $attendee);
        $call = $this->liveCallOf($group) ?? $this->start($group, $user, $media);

        if ($call->caller_id !== $user->id) {
            $this->accept($call, $user);
        }

        $join = $this->calls->join($call, $attendee, $admission);
        $this->signals->publish($call);

        return $join;
    }

    public function decline(YonaGroup $group, User $user): void
    {
        $call = $this->liveCallOf($group);

        if ($call === null) {
            return;
        }

        $call->invitations()->where('user_id', $user->id)->where('status', InvitationStatus::Ringing)
            ->update(['status' => InvitationStatus::Declined, 'responded_at' => now()]);
        $this->settle($call->id);
        $this->signals->publish($call);
    }

    // Hết giờ đổ chuông (ExpireGroupCallJob): ai chưa nghe thì nhỡ.
    public function expire(int $callId): void
    {
        CallInvitation::query()->where('call_id', $callId)->where('status', InvitationStatus::Ringing)
            ->update(['status' => InvitationStatus::Missed, 'responded_at' => now()]);

        $call = $this->settle($callId);

        if ($call !== null) {
            $this->signals->publish($call);
        }
    }

    // Từ sự kiện phòng (GroupCallPresence).
    public function settleAfterPresenceChange(Call $call): void
    {
        $this->settle($call->id);
        $this->signals->publish($call);
    }

    // Quản trị nhóm tắt mic hoặc mời một người ra khỏi cuộc gọi đang diễn ra; quyền kiểm ở lõi.
    public function mute(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->mute($this->currentCallOf($group), $actor, ParticipantIdentity::forUser($targetUserId), MediaSource::Microphone);
    }

    public function remove(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->remove($this->currentCallOf($group), $actor, ParticipantIdentity::forUser($targetUserId));
    }

    public function liveCallOf(YonaGroup $group): ?Call
    {
        return Call::query()->open()
            ->where('kind', GroupCallPolicy::KIND)
            ->where('yona_group_id', $group->id)
            ->whereIn('status', self::LIVE_STATUSES)
            ->first();
    }

    // Các cuộc gọi nhóm còn đang đổ chuông tới một người (mở app hay tải lại trang giữa lúc đổ chuông).
    /** @return Collection<int, Call> */
    public function ringingFor(User $user): Collection
    {
        return Call::query()->open()
            ->where('kind', GroupCallPolicy::KIND)
            ->whereIn('status', self::LIVE_STATUSES)
            ->whereHas('invitations', fn ($query) => $query->where('user_id', $user->id)->where('status', InvitationStatus::Ringing))
            ->with('group')
            ->get();
    }

    private function currentCallOf(YonaGroup $group): Call
    {
        return $this->liveCallOf($group) ?? throw new CallActionRejected('CALL_ENDED');
    }

    private function start(YonaGroup $group, User $caller, CallMedia $media): Call
    {
        try {
            $call = DB::transaction(function () use ($group, $caller, $media): Call {
                $call = Call::query()->create([
                    'uuid' => (string) Str::uuid(),
                    'kind' => GroupCallPolicy::KIND,
                    'yona_group_id' => $group->id,
                    'caller_id' => $caller->id,
                    'media' => $media,
                    'status' => CallStatus::Ringing,
                ]);
                $rangAt = now();
                $call->invitations()->insert($group->activeMembers()->where('user_id', '!=', $caller->id)->pluck('user_id')
                    ->map(fn (int $userId) => [
                        'call_id' => $call->id,
                        'user_id' => $userId,
                        'status' => InvitationStatus::Ringing->value,
                        'rang_at' => $rangAt,
                        'created_at' => $rangAt,
                        'updated_at' => $rangAt,
                    ])->all());

                return $call;
            });
        } catch (UniqueConstraintViolationException) {
            // Hai người bấm gọi cùng lúc: index một-cuộc-mỗi-nhóm giữ cuộc đầu, người sau vào cuộc đó.
            // Cuộc vừa kết thúc mà phòng chưa đóng hẳn thì cũng vướng index: báo thử lại.
            return $this->liveCallOf($group) ?? throw new CallActionRejected('CALL_ENDED');
        }

        ExpireGroupCallJob::dispatch($call->id)->delay(now()->addSeconds((int) config('calls.ring_seconds')));

        return $call->setRelation('group', $group);
    }

    private function accept(Call $call, User $user): void
    {
        DB::transaction(function () use ($call, $user): void {
            $locked = Call::query()->lockForUpdate()->findOrFail($call->id);
            $answeredAt = now();

            CallInvitation::query()->updateOrCreate(
                ['call_id' => $call->id, 'user_id' => $user->id],
                ['status' => InvitationStatus::Accepted, 'responded_at' => $answeredAt, 'rang_at' => $answeredAt],
            );

            if ($locked->status === CallStatus::Ringing) {
                $locked->status = CallStatus::Active;
                $locked->answered_at = $answeredAt;
                $locked->save();
            }

            $call->setRawAttributes($locked->getAttributes(), true);
        });
    }

    private function settle(int $callId): ?Call
    {
        [$call, $changed] = DB::transaction(function () use ($callId): array {
            $call = Call::query()->where('kind', GroupCallPolicy::KIND)->lockForUpdate()->find($callId);

            if ($call === null || ! in_array($call->status, self::LIVE_STATUSES, true)) {
                return [$call, false];
            }

            // Phòng đã tự đóng (mọi người rớt mạng) khi còn đổ chuông: coi như không ai nghe.
            $status = $call->isEnded() ? CallStatus::Missed : $this->outcomeOf($call);

            if ($status === null) {
                return [$call, false];
            }

            // Không ghi ended_at ở đây: sự kiện đóng phòng ghi, rồi dấu vết chạy theo nó.
            $call->status = $status;
            $call->save();
            $call->invitations()->where('status', InvitationStatus::Ringing)
                ->update(['status' => InvitationStatus::Missed, 'responded_at' => now()]);

            return [$call, true];
        });

        if ($changed && ! $call->isEnded()) {
            $this->closeRoom($call);
        }

        return $call;
    }

    private function outcomeOf(Call $call): ?CallStatus
    {
        $hasPresent = $call->presentParticipants()->exists();
        $someoneLeft = $call->participants()->whereNotNull('left_at')->exists();

        return match (true) {
            $call->status === CallStatus::Ringing && ! $hasPresent && $someoneLeft => CallStatus::Cancelled,
            $call->status === CallStatus::Ringing && ! $call->invitations()->where('status', InvitationStatus::Ringing)->exists() => CallStatus::Missed,
            $call->status === CallStatus::Active && ! $hasPresent && $someoneLeft => CallStatus::Ended,
            default => null,
        };
    }

    private function closeRoom(Call $call): void
    {
        try {
            $this->calls->close($call);
        } catch (MediaProviderFailed $exception) {
            // Đối soát định kỳ (ReconcileCallsJob) sẽ khép phòng trống.
            Log::warning('Group call room close failed', ['call_id' => $call->id, 'error' => $exception->getMessage()]);
        }
    }

    // Dòng chưa lưu chỉ để hỏi chính sách trước khi tạo cuộc gọi cho người không có quyền.
    private function draftCallOf(YonaGroup $group): Call
    {
        return (new Call(['kind' => GroupCallPolicy::KIND, 'yona_group_id' => $group->id]))->setRelation('group', $group);
    }
}
