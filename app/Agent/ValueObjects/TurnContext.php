<?php

namespace App\Agent\ValueObjects;

use DateTimeImmutable;
use InvalidArgumentException;

// Bối cảnh một lượt, bất biến trong một bước; Runtime tạo bản mới bằng các hàm with*.
// Mọi cổng nhận account_id từ đây, không đọc trạng thái ngầm.
final readonly class TurnContext
{
    public function __construct(
        public ConversationRef $conversation,
        public int $inboxId,
        public ?int $contactId,
        // AI agent của lõi (conversations.ai_agent_id); cấu hình phía agent tra theo id này.
        public int $aiAgentId,
        public int $turnId,
        public Stimulus $stimulus,
        public AutonomyLevel $autonomy,
        // Tin lõi mới nhất lượt đã thấy; dời khi steer tin khách mới vào lượt.
        public int $snapshotMessageId,
        // Đồng hồ chốt lúc dựng lượt; timezone là múi giờ của inbox.
        public DateTimeImmutable $now,
        public string $timezone,
        public DateTimeImmutable $deadline,
        public Usage $usageSoFar,
    ) {
        if ($deadline <= $now) {
            throw new InvalidArgumentException('Turn deadline must be after the turn start.');
        }
    }

    public function withSnapshotMessageId(int $snapshotMessageId): self
    {
        return $this->with(snapshotMessageId: $snapshotMessageId);
    }

    public function withUsage(Usage $stepUsage): self
    {
        return $this->with(usageSoFar: $this->usageSoFar->plus($stepUsage));
    }

    private function with(?int $snapshotMessageId = null, ?Usage $usageSoFar = null): self
    {
        return new self(
            $this->conversation,
            $this->inboxId,
            $this->contactId,
            $this->aiAgentId,
            $this->turnId,
            $this->stimulus,
            $this->autonomy,
            $snapshotMessageId ?? $this->snapshotMessageId,
            $this->now,
            $this->timezone,
            $this->deadline,
            $usageSoFar ?? $this->usageSoFar,
        );
    }
}
