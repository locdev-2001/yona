<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;

final readonly class ConversationSnapshot
{
    public function __construct(
        public ConversationRef $ref,
        public int $inboxId,
        public ?int $contactId,
        public ?int $assigneeUserId,
        // AI agent đang tự động trả lời; null = hội thoại thủ công.
        public ?int $aiAgentId,
        public ?DateTimeImmutable $floorHeldUntil,
        // Cửa sổ trả lời của kênh còn mở.
        public bool $canReply,
        public bool $isGroup,
        public string $timezone,
        // Loại kênh trung tính của inbox (vd `web_widget`, `zalo`, `email`).
        public string $channel = 'unknown',
        // Account đang hoạt động (không bị treo).
        public bool $accountActive = true,
    ) {}
}
