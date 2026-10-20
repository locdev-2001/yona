<?php

namespace App\Services\Yona\Calls;

use App\Exceptions\CallActionRejected;
use App\Jobs\Calls\ExpireDirectCallJob;
use App\Models\Account;
use App\Models\Call;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\CallJoin;
use App\Services\Calls\CallMedia;
use App\Services\Calls\CallService;
use App\Services\Calls\CallStatus;
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Users\Friendships;
use App\Services\Yona\YonaRelay;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Gọi 1-1 có đổ chuông giữa hai người dùng Yona là bạn bè, dựng trên lõi cuộc gọi. Đời một cuộc
// gọi: ringing → active (nghe máy) | declined | cancelled | missed; active → ended khi một bên
// cúp hoặc rời. Mỗi lần đổi trạng thái thì báo cả hai bên (DirectCallSignals); trạng thái kết
// thúc thì đóng phòng, dấu vết hai bên ghi khi sự kiện đóng phòng về tới (DirectCallTrail).
final readonly class DirectCalls
{
    public const RING_SECONDS = 30;

    private const LIVE_STATUSES = [CallStatus::Ringing, CallStatus::Active];

    public function __construct(
        private CallService $calls,
        private YonaRelay $relay,
        private Friendships $friendships,
        private DirectCallSignals $signals,
    ) {}

    // Người kia trong hội thoại 1-1 trên Yona và mình có gọi được họ không (chỉ bạn bè).
    /** @return array{callable: bool, peer: User|null} */
    public function eligibility(Account $account, int $conversationDisplayId, User $viewer): array
    {
        $peer = $this->peerIn($this->conversationOf($account, $conversationDisplayId));

        return ['callable' => $peer !== null && $this->friendships->areFriends($viewer, $peer->id), 'peer' => $peer];
    }

    public function start(Account $account, int $conversationDisplayId, User $caller, CallMedia $media): CallJoin
    {
        $callee = $this->peerIn($this->conversationOf($account, $conversationDisplayId)) ?? throw new CallActionRejected('NOT_DIRECT');

        if (! $this->friendships->areFriends($caller, $callee->id)) {
            throw CallActionRejected::forbidden('NOT_FRIENDS');
        }

        if ($this->isBusy($caller)) {
            throw new CallActionRejected('YOU_BUSY', 409);
        }

        if ($this->isBusy($callee)) {
            throw new CallActionRejected('BUSY', 409);
        }

        try {
            $call = Call::query()->create([
                'uuid' => (string) Str::uuid(),
                'kind' => DirectCallPolicy::KIND,
                'caller_id' => $caller->id,
                'callee_id' => $callee->id,
                'pair_key' => self::pairKey($caller->id, $callee->id),
                'media' => $media,
                'status' => CallStatus::Ringing,
            ]);
        } catch (UniqueConstraintViolationException) {
            // Hai người bấm gọi nhau cùng lúc: index một-cuộc-sống-mỗi-cặp giữ lại cuộc đầu.
            throw new CallActionRejected('BUSY', 409);
        }

        $join = $this->calls->join($call, CallAttendee::user($caller));
        $this->signals->publish($call);
        ExpireDirectCallJob::dispatch($call->id)->delay(now()->addSeconds(self::RING_SECONDS));

        return $join;
    }

    public function accept(int $callId, User $callee, CallMedia $media): CallJoin
    {
        $call = DB::transaction(function () use ($callId, $callee): Call {
            $call = $this->lockedCallFor($callId, $callee);

            if ($call->callee_id !== $callee->id || $call->status !== CallStatus::Ringing) {
                throw new CallActionRejected('CALL_ENDED');
            }

            $call->status = CallStatus::Active;
            $call->answered_at = now();
            $call->save();

            return $call;
        });

        $join = $this->calls->join($call, CallAttendee::user($callee));
        $this->signals->publish($call);

        return $join;
    }

    // Một nút cúp cho mọi tình huống: người gọi huỷ khi còn đổ chuông, người nhận từ chối, ai cũng
    // kết thúc được cuộc đã nối.
    public function hangUp(int $callId, User $user): Call
    {
        return $this->finish($callId, fn (Call $call) => match (true) {
            $call->status === CallStatus::Active => CallStatus::Ended,
            $call->status === CallStatus::Ringing && $call->caller_id === $user->id => CallStatus::Cancelled,
            $call->status === CallStatus::Ringing => CallStatus::Declined,
            default => null,
        }, $user);
    }

    // Hết giờ đổ chuông mà chưa ai nghe (ExpireDirectCallJob).
    public function expire(int $callId): void
    {
        $this->finish($callId, fn (Call $call) => $call->status === CallStatus::Ringing ? CallStatus::Missed : null);
    }

    // Từ sự kiện phòng (DirectCallPresence): người gọi bỏ đi khi còn đổ chuông thì huỷ; sau khi
    // đã nghe máy mà một bên rời hẳn thì kết thúc.
    public function settleAfterPresenceChange(Call $call): void
    {
        $this->finish($call->id, function (Call $call): ?CallStatus {
            $present = $call->presentParticipants()->pluck('user_id')->all();
            $callerLeft = $call->participants()->where('user_id', $call->caller_id)->whereNotNull('left_at')->exists();

            return match (true) {
                $call->status === CallStatus::Ringing && $callerLeft && ! in_array($call->caller_id, $present, true) => CallStatus::Cancelled,
                $call->status === CallStatus::Active && $call->answered_at !== null && count($present) < 2
                    && $call->participants()->where('left_at', '>=', $call->answered_at)->exists() => CallStatus::Ended,
                default => null,
            };
        });
    }

    // Cuộc gọi 1-1 còn sống của một người (để tải lại trang vẫn thấy cuộc đang đổ chuông/đang nói).
    public function liveCallOf(User $user): ?Call
    {
        return Call::query()
            ->where('kind', DirectCallPolicy::KIND)
            ->whereIn('status', self::LIVE_STATUSES)
            ->where(fn ($query) => $query->where('caller_id', $user->id)->orWhere('callee_id', $user->id))
            ->latest('id')
            ->first();
    }

    public function peerOf(Call $call, User $viewer): ?User
    {
        return User::query()->find($viewer->id === $call->caller_id ? $call->callee_id : $call->caller_id);
    }

    public static function pairKey(int $userId, int $otherUserId): string
    {
        return min($userId, $otherUserId).':'.max($userId, $otherUserId);
    }

    /** @param  callable(Call): ?CallStatus  $outcome */
    private function finish(int $callId, callable $outcome, ?User $actor = null): Call
    {
        [$call, $changed] = DB::transaction(function () use ($callId, $outcome, $actor): array {
            $call = $actor === null
                ? Call::query()->where('kind', DirectCallPolicy::KIND)->lockForUpdate()->findOrFail($callId)
                : $this->lockedCallFor($callId, $actor);
            $status = $outcome($call);

            if ($status === null) {
                return [$call, false];
            }

            // Không ghi ended_at ở đây: sự kiện đóng phòng ghi, rồi dấu vết hai bên chạy theo nó.
            $call->status = $status;
            $call->save();

            return [$call, true];
        });

        if ($changed) {
            $this->signals->publish($call);
            $this->closeRoom($call);
        }

        return $call;
    }

    private function closeRoom(Call $call): void
    {
        try {
            $this->calls->close($call);
        } catch (MediaProviderFailed $exception) {
            // Đối soát định kỳ (ReconcileCallsJob) sẽ khép phòng trống.
            Log::warning('Direct call room close failed', ['call_id' => $call->id, 'error' => $exception->getMessage()]);
        }
    }

    private function lockedCallFor(int $callId, User $user): Call
    {
        $call = Call::query()->where('kind', DirectCallPolicy::KIND)->lockForUpdate()->find($callId);

        if ($call === null || ($call->caller_id !== $user->id && $call->callee_id !== $user->id)) {
            throw CallActionRejected::forbidden('NOT_A_PARTICIPANT');
        }

        return $call;
    }

    private function isBusy(User $user): bool
    {
        return $this->liveCallOf($user) !== null
            || Call::query()->open()->whereHas('presentParticipants', fn ($query) => $query->where('user_id', $user->id))->exists();
    }

    private function conversationOf(Account $account, int $displayId): Conversation
    {
        return $account->conversations()->where('display_id', $displayId)->firstOrFail();
    }

    private function peerIn(Conversation $conversation): ?User
    {
        $isDirectYonaChat = $conversation->thread_conversation_id === null && $conversation->inbox?->channel_type === 'Channel::Yona';

        return $isDirectYonaChat ? $this->relay->counterpartOf($conversation) : null;
    }
}
