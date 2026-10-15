<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;

// Kích thích đã dịch từ sự kiện lõi; chỉ mang id, không mang model của lõi.
final readonly class Stimulus
{
    public function __construct(
        public StimulusKind $kind,
        public ConversationRef $conversation,
        public ?int $coreMessageId,
        public DateTimeImmutable $occurredAt,
    ) {}
}
