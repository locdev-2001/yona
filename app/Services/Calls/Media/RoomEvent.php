<?php

namespace App\Services\Calls\Media;

use Carbon\CarbonImmutable;

// Sự kiện phòng đã kiểm chữ ký, đã dịch khỏi định dạng nhà cung cấp. `identity` chỉ có ở
// sự kiện vào/ra phòng.
final readonly class RoomEvent
{
    public function __construct(
        public RoomEventType $type,
        public string $room,
        public CarbonImmutable $occurredAt,
        public ?string $identity = null,
    ) {}
}
