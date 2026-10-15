<?php

namespace App\Agent\Boundary\Inbound;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\Stimulus;
use App\Agent\ValueObjects\StimulusKind;
use App\Models\Message;
use DateTimeImmutable;

final class StimulusMapper
{
    // null khi tin không còn (đã xoá) hoặc không phải tin khách của hội thoại trong account đó.
    public function customerMessage(int $accountId, int $conversationId, int $messageId, int $occurredAt): ?Stimulus
    {
        $isCustomerMessage = Message::query()
            ->where('account_id', $accountId)
            ->where('conversation_id', $conversationId)
            ->whereKey($messageId)
            ->where('message_type', Message::TYPE_INCOMING)
            ->where('private', false)
            ->exists();

        return $isCustomerMessage ? new Stimulus(
            StimulusKind::CustomerMessage,
            new ConversationRef($accountId, $conversationId),
            $messageId,
            (new DateTimeImmutable)->setTimestamp($occurredAt),
        ) : null;
    }
}
