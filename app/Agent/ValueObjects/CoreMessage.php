<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;

// Ảnh chụp một tin của lõi cho Transcript; không mang model Eloquent.
final readonly class CoreMessage
{
    /** @param list<string> $attachmentTypes loại tệp đính kèm (image, audio, file…) */
    public function __construct(
        public int $id,
        public MessageOrigin $origin,
        public ?string $text,
        public bool $private,
        public DateTimeImmutable $createdAt,
        public ?int $senderUserId = null,
        public ?int $senderAiAgentId = null,
        public array $attachmentTypes = [],
        // Tên hiển thị của người gửi phía shop (nhân viên, AI agent); null với khách.
        public ?string $senderName = null,
    ) {}
}
