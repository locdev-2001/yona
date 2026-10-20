<?php

namespace App\Services\Calls\Media;

use Carbon\CarbonImmutable;

// Sự kiện phòng đã kiểm chữ ký, đã dịch khỏi định dạng nhà cung cấp. `identity` có ở sự kiện
// của một người (vào/ra, bật/tắt nguồn phát), kèm tên hiển thị người đó dùng khi vào; `source`
// chỉ có ở sự kiện bật/tắt nguồn phát.
final readonly class RoomEvent
{
    public function __construct(
        public RoomEventType $type,
        public string $room,
        public CarbonImmutable $occurredAt,
        public ?string $identity = null,
        public ?MediaSource $source = null,
        public ?string $displayName = null,
    ) {}
}
