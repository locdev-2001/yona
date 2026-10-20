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
    ) {}
}
