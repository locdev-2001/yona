<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Địa chỉ một hội thoại của lõi; luôn mang account_id để mọi cổng lọc tenant tường minh.
final readonly class ConversationRef
{
    public function __construct(
        public int $accountId,
        public int $conversationId,
    ) {
        if ($accountId <= 0 || $conversationId <= 0) {
            throw new InvalidArgumentException('Conversation reference needs positive account and conversation ids.');
        }
    }
}
