<?php

namespace App\Services\Calls\Media;

// Phòng cần mở phía nhà cung cấp. Trần người đặt ở phòng, không đặt ở vé.
final readonly class RoomSpec
{
    public function __construct(
        public string $name,
        public int $maxParticipants,
        public int $emptyTimeoutSeconds,
        public int $departureTimeoutSeconds,
    ) {}
}
