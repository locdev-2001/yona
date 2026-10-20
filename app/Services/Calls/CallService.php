<?php

namespace App\Services\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Calls\Media\RoomSpec;
use App\Services\Calls\Media\TicketRequest;
use App\Services\Calls\Policies\CallPolicies;
use App\Services\Calls\Policies\CallPolicy;

// Lõi cuộc gọi: không biết nhóm, 1-1 hay nhà cung cấp media nào. Nhận một dòng `calls` đã
// có, hỏi chính sách theo loại để vào phòng, cấp vé, điều hành. Mỗi tính năng (phòng nhóm,
// gọi 1-1…) tự tạo dòng `calls` của mình rồi gọi vào đây. Ai đang ở trong phòng không ghi ở
// đây mà từ sự kiện phòng (CallPresenceRecorder).
final readonly class CallService
{
    private const TICKET_TTL_SECONDS = 3600;

    // Phòng vừa mở mà chưa ai vào thì giữ chừng này rồi đóng.
    private const EMPTY_ROOM_TIMEOUT_SECONDS = 60;

    // Người cuối cùng rời phòng thì giữ chừng này cho người rớt mạng kịp vào lại.
    private const DEPARTURE_TIMEOUT_SECONDS = 20;

    public function __construct(
        private CallPolicies $policies,
        private MediaRooms $rooms,
        private MediaTickets $tickets,
        private MediaModeration $moderation,
    ) {}

    public function join(Call $call, User $user): CallJoin
    {
        $policy = $this->policyOf($call);
        $policy->authorizeJoin($call, $user);

        if ($call->isEnded()) {
            throw new CallActionRejected('CALL_ENDED');
        }

        $this->rooms->open(new RoomSpec($call->uuid, $policy->maxParticipants(), self::EMPTY_ROOM_TIMEOUT_SECONDS, self::DEPARTURE_TIMEOUT_SECONDS));

        $ticket = $this->tickets->issue(new TicketRequest(
            $call->uuid,
            ParticipantIdentity::forUser($user->id),
            $user->availableName(),
            $policy->permissionsFor($call, $user),
            self::TICKET_TTL_SECONDS,
        ));

        return new CallJoin($call, $ticket);
    }

    public function mute(Call $call, User $actor, User $target, MediaSource $source): void
    {
        $this->authorizeModeration($call, $actor);
        $this->moderation->mute($call->uuid, ParticipantIdentity::forUser($target->id), $source);
    }

    public function remove(Call $call, User $actor, User $target): void
    {
        $this->authorizeModeration($call, $actor);
        $this->moderation->remove($call->uuid, ParticipantIdentity::forUser($target->id));
    }

    // Đóng phòng phía nhà cung cấp; dòng `calls` khép lại khi sự kiện phòng kết thúc về tới.
    public function close(Call $call): void
    {
        $this->rooms->close($call->uuid);
    }

    private function authorizeModeration(Call $call, User $actor): void
    {
        if (! $this->policyOf($call)->mayModerate($call, $actor)) {
            throw CallActionRejected::forbidden('MODERATION_FORBIDDEN');
        }
    }

    private function policyOf(Call $call): CallPolicy
    {
        return $this->policies->for($call->kind);
    }
}
