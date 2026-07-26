<?php

namespace App\Modules\Chat\Intake;

use App\Models\Message;
use App\Models\MessageSourceAlias;

/**
 * P02 — 1 điểm resolve tin theo platform source_id (messages.source_id → miss
 * thì message_source_aliases). Dùng chung: ingest dedup (per-conversation) +
 * message-state events (per-account: event zca không mang conversation_id,
 * chỉ có msgId + connection → channel_account).
 */
class DuplicateResolver
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
        return $this->findManyForAccount($channelAccountId, [$sourceId])[$sourceId] ?? null;
    }

    /**
     * P02 review MED-1 — batch resolve cho event dày (seen 1-50 tin/batch):
     * 2 query whereIn thay vì 2N. Trả map source_id → Message.
     *
     * @param  list<string>  $sourceIds
     * @return array<string, Message>
     */
    public function findManyForAccount(string $channelAccountId, array $sourceIds): array
    {
        $sourceIds = array_values(array_unique(array_filter($sourceIds)));
        if ($sourceIds === []) {
            return [];
        }

        $found = Message::whereHas('conversation', fn ($q) => $q->where('channel_account_id', $channelAccountId))
            ->whereIn('source_id', $sourceIds)
            ->with('conversation:id,thread_type,workspace_id')
            ->get()
            ->keyBy('source_id')
            ->all();

        $missing = array_diff($sourceIds, array_keys($found));
        if ($missing !== []) {
            $aliases = MessageSourceAlias::whereIn('source_id', array_values($missing))
                ->whereHas('conversation', fn ($q) => $q->where('channel_account_id', $channelAccountId))
                ->get(['source_id', 'message_id']);

            if ($aliases->isNotEmpty()) {
                $aliasMessages = Message::whereIn('id', $aliases->pluck('message_id'))
                    ->with('conversation:id,thread_type,workspace_id')
                    ->get()
                    ->keyBy('id');
                foreach ($aliases as $alias) {
                    $message = $aliasMessages->get($alias->message_id);
                    if ($message !== null) {
                        $found[$alias->source_id] = $message;
                    }
                }
            }
        }

        return $found;
    }
}
