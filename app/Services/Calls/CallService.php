<?php

namespace App\Services\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Kinds\CallKinds;
use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Calls\Media\RoomSpec;
use App\Services\Calls\Media\TicketRequest;

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

    public function join(Call $call, CallAttendee $attendee): CallJoin
    {
        $admission = $this->admit($call, $attendee);

        if ($call->isEnded()) {
            throw new CallActionRejected('CALL_ENDED');
        }

        if (! $admission->isGranted()) {
            return new CallJoin($call, null);
        }

        $this->rooms->open(new RoomSpec(
            $call->uuid,
            $this->kinds->policyOf($call)->maxParticipants(),
            self::EMPTY_ROOM_TIMEOUT_SECONDS,
            self::DEPARTURE_TIMEOUT_SECONDS,
        ));

        return new CallJoin($call, $this->tickets->issue(new TicketRequest(
            $call->uuid,
            $attendee->identity->toString(),
            $attendee->displayName,
            $admission->permissions,
            self::TICKET_TTL_SECONDS,
        )));
    }

    public function mute(Call $call, User $actor, ParticipantIdentity $target, MediaSource $source): void
    {
        $this->authorizeModeration($call, $actor);
        $this->moderation->mute($call->uuid, $target->toString(), $source);
    }

    public function remove(Call $call, User $actor, ParticipantIdentity $target): void
    {
        $this->authorizeModeration($call, $actor);
        $this->moderation->remove($call->uuid, $target->toString());
    }

    // Đóng phòng phía nhà cung cấp; dòng `calls` khép lại khi sự kiện phòng kết thúc về tới.
    public function close(Call $call): void
    {
        $this->rooms->close($call->uuid);
    }

    private function authorizeModeration(Call $call, User $actor): void
    {
        if (! $this->kinds->policyOf($call)->mayModerate($call, $actor)) {
            throw CallActionRejected::forbidden('MODERATION_FORBIDDEN');
        }
    }
}
