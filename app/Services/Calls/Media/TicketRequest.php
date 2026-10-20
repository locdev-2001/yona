<?php

namespace App\Services\Calls\Media;

final readonly class TicketRequest
{
    public function __construct(
        public string $room,
        public string $identity,
        public string $displayName,
        public ParticipantPermissions $permissions,
        public int $ttlSeconds,
        // Thông tin hiển thị kèm người trong phòng (ảnh đại diện…), ai trong phòng cũng đọc được.
        /** @var array<string, string> */
        public array $attributes = [],
    ) {}
}
