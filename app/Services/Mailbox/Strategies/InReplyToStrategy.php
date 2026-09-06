<?php

namespace App\Services\Mailbox\Strategies;

use App\Models\Conversation;
use App\Models\Message;

// Chiến lược 2 — header In-Reply-To trỏ về tin nhắn hoặc uuid hội thoại đã có.
class InReplyToStrategy extends BaseStrategy
{
    public function find(): ?Conversation
    {
        $inReplyTo = $this->mail->inReplyTo();

        if (blank($inReplyTo)) {
            return null;
        }

        $uuid = $this->extractUuidFromPatterns((string) $inReplyTo);

        if ($uuid !== null) {
            $conversation = Conversation::query()->where('uuid', $uuid)->first();

            if ($conversation !== null) {
                return $conversation;
            }
        }

        return Message::query()->where('source_id', $inReplyTo)->first()?->conversation;
    }
}
