<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\RoomEvent;
use App\Services\Calls\Media\RoomEventType;
use Carbon\CarbonImmutable;

// Đối soát người đang ngồi trong phòng (DB) với người thật sự kết nối ở nhà cung cấp, cho lúc
// webhook bị mất (app tắt, mạng chập). Mọi chỗ lệch đi qua CallPresenceRecorder như một sự kiện
// phòng bình thường, nên dấu vết và realtime vẫn chạy một đường.
final readonly class CallReconciler
{
    // Người vừa có vé có thể còn đang kết nối: chưa coi là đã rời.
    private const CONNECTING_GRACE_SECONDS = 30;

    // Phòng trống lâu hơn hẹn giờ đóng của nhà cung cấp (60s chưa ai vào, 20s sau người cuối) mà
    // vẫn chưa có sự kiện kết thúc: coi như đã đóng.
    private const EMPTY_ROOM_GRACE_SECONDS = 90;

    public function __construct(
        private CallPresenceRecorder $recorder,
        private MediaRooms $rooms,
    ) {}

    public function reconcileOpenCalls(): void
    {
        Call::query()->open()->with('presentParticipants')->each(fn (Call $call) => $this->reconcile($call));
    }

    public function reconcile(Call $call): void
    {
        try {
            $connected = $this->rooms->participantIdentities($call->uuid);
        } catch (MediaProviderFailed) {
            return;
        }

        $now = CarbonImmutable::now();
        $stored = $call->presentParticipants->keyBy(fn (CallParticipant $row) => ParticipantIdentity::forUser($row->user_id)->toString());

        foreach (array_diff($connected, $stored->keys()->all()) as $identity) {
            $this->record($call, RoomEventType::ParticipantJoined, $now, $identity);
        }

        foreach ($stored as $identity => $row) {
            if (! in_array($identity, $connected, true) && $row->joined_at->diffInSeconds($now) > self::CONNECTING_GRACE_SECONDS) {
                $this->record($call, RoomEventType::ParticipantLeft, $now, $identity);
            }
        }

        if ($connected === [] && $this->lastActivityOf($call)->diffInSeconds($now) > self::EMPTY_ROOM_GRACE_SECONDS) {
            $this->record($call, RoomEventType::RoomFinished, $now);
        }
    }

    private function lastActivityOf(Call $call): CarbonImmutable
    {
        $lastLeftAt = $call->participants()->max('left_at');
        $lastJoinedAt = $call->participants()->max('joined_at');

        return CarbonImmutable::parse(max(array_filter([$call->created_at, $lastLeftAt, $lastJoinedAt])));
    }

    private function record(Call $call, RoomEventType $type, CarbonImmutable $at, ?string $identity = null): void
    {
        $this->recorder->record(new RoomEvent($type, $call->uuid, $at, $identity), $this->rooms);
    }
}
