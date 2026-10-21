<?php

namespace App\Services\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Kinds\CallKinds;
use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Calls\Media\RoomSpec;
use App\Services\Calls\Media\TicketRequest;
use Illuminate\Support\Facades\Log;

// Lõi cuộc gọi: không biết nhóm, 1-1, meeting hay nhà cung cấp media nào. Module dùng lõi tự
// tạo dòng `calls` của mình rồi gọi vào đây; luật từng loại lấy từ sổ CallKinds. Ai đang ở
// trong phòng không ghi ở đây mà từ sự kiện phòng (CallPresenceRecorder).
final readonly class CallService
{
    private const TICKET_TTL_SECONDS = 3600;

    // Phòng vừa mở mà chưa ai vào thì giữ chừng này rồi đóng.
    private const EMPTY_ROOM_TIMEOUT_SECONDS = 60;

    // Người cuối cùng rời phòng thì giữ chừng này cho người rớt mạng kịp vào lại.
    private const DEPARTURE_TIMEOUT_SECONDS = 20;

    public function __construct(
        private CallKinds $kinds,
        private MediaRooms $rooms,
        private MediaTickets $tickets,
        private MediaModeration $moderation,
    ) {}

    // Bước cấp phép tách riêng để module hỏi trước khi tạo dòng `calls` của mình.
    public function admit(Call $call, CallAttendee $attendee): Admission
    {
        return $this->kinds->policyOf($call)->admit($call, $attendee);
    }

    // Module đã hỏi chính sách trước khi tạo dòng `calls` thì truyền kết quả vào, khỏi hỏi lại.
    public function join(Call $call, CallAttendee $attendee, ?Admission $admission = null): CallJoin
    {
        $admission ??= $this->admit($call, $attendee);

        if ($call->isEnded()) {
            throw new CallActionRejected('CALL_ENDED');
        }

        if (! $admission->isGranted()) {
            return new CallJoin($call, null);
        }

        $maxParticipants = $this->kinds->policyOf($call)->maxParticipants();
        $this->rejectWhenFull($call, $attendee, $maxParticipants);
        $this->leaveOtherCalls($call, $attendee);

        $this->rooms->open(new RoomSpec(
            $call->uuid,
            $maxParticipants,
            self::EMPTY_ROOM_TIMEOUT_SECONDS,
            self::DEPARTURE_TIMEOUT_SECONDS,
        ));

        return new CallJoin($call, $this->tickets->issue(new TicketRequest(
            $call->uuid,
            $attendee->identity->toString(),
            $attendee->displayName,
            $admission->permissions,
            self::TICKET_TTL_SECONDS,
            $attendee->displayAttributes(),
        )), $admission->permissions);
    }

    public function mute(Call $call, User $actor, ParticipantIdentity $target, MediaSource $source): void
    {
        $this->authorizeModeration($call, $actor);
        $this->moderation->mute($call->uuid, $target->toString(), $source);
    }

    public function remove(Call $call, User $actor, ParticipantIdentity $target): void
    {
        $this->authorizeModeration($call, $actor);
        $this->disconnect($call, $target);
    }

    // Đưa một người khỏi phòng vì họ không còn quyền ở đó (rời nhóm…), không qua quyền điều hành.
    public function disconnect(Call $call, ParticipantIdentity $participant): void
    {
        $this->moderation->remove($call->uuid, $participant->toString());
    }

    // Đóng phòng phía nhà cung cấp; dòng `calls` khép lại khi sự kiện phòng kết thúc về tới.
    public function close(Call $call): void
    {
        $this->rooms->close($call->uuid);
    }

    // Chặn trước khi cấp vé để báo được lý do; nhà cung cấp vẫn chặn ở trần phòng. Bản ghi DB đủ
    // cho đa số lượt vào; chỉ khi DB báo đầy (có thể do dòng cũ vì mất webhook) mới hỏi nhà cung cấp.
    private function rejectWhenFull(Call $call, CallAttendee $attendee, int $maxParticipants): void
    {
        $present = $call->presentParticipants();
        $userId = $attendee->identity->userId();

        if ($userId !== null) {
            $present->where('user_id', '!=', $userId);
        }

        if ($present->count() < $maxParticipants) {
            return;
        }

        $others = array_diff($this->rooms->participantIdentities($call->uuid), [$attendee->identity->toString()]);

        if (count($others) >= $maxParticipants) {
            throw new CallActionRejected('ROOM_FULL', 409, ['max' => $maxParticipants]);
        }
    }

    // Mỗi người chỉ ở một cuộc gọi tại một lúc: vào cuộc này thì tự rời mọi cuộc khác đang ngồi.
    // Hệ quả ở cuộc cũ (1-1 kết thúc, phòng nhóm bớt người) do loại của cuộc đó xử lý khi sự kiện
    // rời phòng về tới.
    private function leaveOtherCalls(Call $call, CallAttendee $attendee): void
    {
        $userId = $attendee->identity->userId();

        if ($userId === null) {
            return;
        }

        Call::query()->open()
            ->whereKeyNot($call->id)
            ->whereHas('presentParticipants', fn ($query) => $query->where('user_id', $userId))
            ->each(function (Call $otherCall) use ($attendee): void {
                try {
                    $this->disconnect($otherCall, $attendee->identity);
                } catch (MediaProviderFailed $exception) {
                    Log::warning('Leaving the previous call failed', ['call_id' => $otherCall->id, 'error' => $exception->getMessage()]);
                }
            });
    }

    private function authorizeModeration(Call $call, User $actor): void
    {
        if (! $this->kinds->policyOf($call)->mayModerate($call, $actor)) {
            throw CallActionRejected::forbidden('MODERATION_FORBIDDEN');
        }
    }
}
