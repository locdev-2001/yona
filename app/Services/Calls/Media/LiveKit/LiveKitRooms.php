<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\RoomSpec;

final readonly class LiveKitRooms implements MediaRooms
{
    public function __construct(private LiveKitRoomService $roomService) {}

    // CreateRoom trả lại phòng sẵn có nếu tên đã mở, nên gọi lại an toàn.
    public function open(RoomSpec $spec): void
    {
        $this->roomService->call('CreateRoom', [
            'name' => $spec->name,
            'maxParticipants' => $spec->maxParticipants,
            'emptyTimeout' => $spec->emptyTimeoutSeconds,
            'departureTimeout' => $spec->departureTimeoutSeconds,
        ], ['roomCreate' => true]);
    }

    // Bỏ người đang ở trạng thái đã ngắt (ParticipantInfo.State DISCONNECTED = 3).
    private const DISCONNECTED_STATES = ['DISCONNECTED', 3];

    public function participantIdentities(string $room): array
    {
        $response = $this->roomService->call('ListParticipants', ['room' => $room], ['roomAdmin' => true, 'room' => $room]);
        $connected = array_filter(
            $response['participants'] ?? [],
            fn (array $participant) => ! in_array($participant['state'] ?? null, self::DISCONNECTED_STATES, true),
        );

        return array_values(array_map(fn (array $participant) => (string) $participant['identity'], $connected));
    }

    public function close(string $room): void
    {
        $this->roomService->call('DeleteRoom', ['room' => $room], ['roomCreate' => true]);
    }
}
