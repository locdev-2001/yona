<?php

namespace App\Agent\Runtime;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\Stimulus;
use App\Agent\ValueObjects\StimulusKind;
use DateTimeImmutable;

// Lệnh chạy một lượt, mang theo job: chỉ id và mốc giờ, đọc lại mọi thứ khi chạy.
final readonly class TurnOrder
{
    public function __construct(
        public int $accountId,
        public int $conversationId,
        public int $wakeMessageId,
        public int $occurredAt,
    ) {}

    public static function from(Stimulus $stimulus): self
    {
        return new self(
            $stimulus->conversation->accountId,
            $stimulus->conversation->conversationId,
            (int) $stimulus->coreMessageId,
            $stimulus->occurredAt->getTimestamp(),
        );
    }

    public function conversation(): ConversationRef
    {
        return new ConversationRef($this->accountId, $this->conversationId);
    }

    public function stimulus(): Stimulus
    {
        return new Stimulus(StimulusKind::CustomerMessage, $this->conversation(), $this->wakeMessageId, (new DateTimeImmutable)->setTimestamp($this->occurredAt));
    }
}
