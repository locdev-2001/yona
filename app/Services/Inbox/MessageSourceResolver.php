<?php

namespace App\Services\Inbox;

use App\Models\Message;
use App\Models\MessageSourceAlias;

/**
 * P02 — 1 điểm resolve tin theo platform source_id (messages.source_id → miss
 * thì message_source_aliases). Dùng chung: ingest dedup (per-conversation) +
 * message-state events (per-account: event zca không mang conversation_id,
 * chỉ có msgId + connection → channel_account).
 */
class MessageSourceResolver
{
    public function find(string $conversationId, string $sourceId): ?Message
    {
        $direct = Message::where('conversation_id', $conversationId)
            ->where('source_id', $sourceId)
            ->first();

        if ($direct !== null) {
            return $direct;
        }

        $aliasedMessageId = MessageSourceAlias::messageIdFor($conversationId, $sourceId);

        return $aliasedMessageId === null ? null : Message::find($aliasedMessageId);
    }

    /**
     * Resolve theo channel_account (mọi conversation của tài khoản): msgId Zalo
     * thực tế duy nhất per-account — né hẳn semantics threadId mơ hồ của từng
     * loại event (seen dùng idTo, undo dùng uidFrom/idTo tùy chiều...).
     */
    public function findForAccount(string $channelAccountId, string $sourceId): ?Message
    {
        $direct = Message::whereHas('conversation', fn ($q) => $q->where('channel_account_id', $channelAccountId))
            ->where('source_id', $sourceId)
            ->first();

        if ($direct !== null) {
            return $direct;
        }

        $alias = MessageSourceAlias::where('source_id', $sourceId)
            ->whereHas('conversation', fn ($q) => $q->where('channel_account_id', $channelAccountId))
            ->first();

        return $alias === null ? null : Message::find($alias->message_id);
    }
}
