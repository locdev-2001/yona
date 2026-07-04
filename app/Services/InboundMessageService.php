<?php

namespace App\Services;

use App\Events\MessageReceived;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageSourceAlias;
use App\Models\WorkspaceSequence;
use App\Services\Inbox\SessionGapMaterializer;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Channel-agnostic inbound message ingestor (F2, F13, F14, F20).
 *
 * Caller (channel webhook) bind RLS TenantScope TRƯỚC khi gọi ingest().
 * Service này KHÔNG biết kênh cụ thể — nhận normalized payload đã parse.
 *
 * Nguyên tắc bất biến:
 *  F13/F20: LUÔN ghi Conversation+Message kể cả hết quota — KHÔNG gọi gate inbound.
 *  F14:     direction='in' (default fail-safe khi thiếu field) — KHÔNG meter.
 *           direction='out' → meterReply() trong try/catch (fail-safe: lỗi gate KHÔNG chặn).
 *  F14 idempotency: updateOrCreate theo (conversation_id, source_id) — trùng source_id = no-op.
 *
 * @param array{
 *   channel_account_id?: string|null,
 *   channel?: string,
 *   peer_uid: string,
 *   thread_type?: int,
 *   peer_name?: string|null,
 *   peer_avatar?: string|null,
 *   peer_phone?: string|null,
 *   direction?: string,
 *   type?: string,
 *   body?: string|null,
 *   media_url?: string|null,
 *   media_meta?: array<string, mixed>,
 *   source_id?: string|null,
 *   platform_sent_at?: string|\DateTimeInterface|null,
 *   sender_uid?: string|null,
 *   sender_name?: string|null,
 *   sent_by?: int|null,
 *   platform_meta?: array<string, mixed>,
 * } $normalized
 */
class InboundMessageService
{
    public function __construct(
        private readonly MeteringService $meteringService,
        private readonly SessionGapMaterializer $gapMaterializer,
    ) {}

    public function ingest(array $normalized): Message
    {
        // --- Upsert Conversation ---
        $conversation = $this->upsertConversation($normalized);

        // --- Direction fail-safe (F14): default 'in' nếu không có field ---
        $direction = $normalized['direction'] ?? 'in';

        // --- P05: gap marker TRƯỚC khi message post-gap "visible" (chokepoint) ---
        $gapMaterialized = $this->gapMaterializer->materializeIfNeeded($conversation, $normalized['platform_sent_at'] ?? null);

        // --- Upsert Message (idempotent per source_id) ---
        $message = $this->upsertMessage($conversation, $normalized, $direction);

        // --- Update conversation cache ---
        $this->updateConversationCache($conversation, $message, $direction);

        // --- Meter outbound (F1) — fail-safe, lỗi KHÔNG chặn ---
        if ($direction === 'out') {
            try {
                $this->meteringService->meterReply($conversation);
            } catch (\Throwable) {
                // ponytail: fail-safe F13/F20 — lỗi gate không chặn ghi/broadcast
            }
        }

        // --- Broadcast realtime ---
        // Reload conversation để payload broadcastWith() có last_message_at/stream_version mới nhất
        $message->setRelation('conversation', $conversation->fresh() ?? $conversation);
        event(new MessageReceived($message, $gapMaterialized));

        return $message;
    }

    /**
     * P08 — 1 path duy nhất: key (channel_account_id, peer_uid). channel_account_id
     * ổn định qua reconnect (không như zalo_connection_id cũ, đổi mỗi lần reconnect) —
     * không còn cần findConversationByAccount/dedupe riêng cho case reconnect.
     *
     * @param  array<string, mixed>  $normalized
     */
    protected function upsertConversation(array $normalized): Conversation
    {
        $channel = $normalized['channel'] ?? 'zalo_personal';
        $channelAccountId = $normalized['channel_account_id'] ?? null;
        $peerUid = $normalized['peer_uid'];

        $existing = $this->findConversation($channelAccountId, $peerUid);

        if ($existing !== null) {
            return $this->applyPeerUpdates($existing, $normalized);
        }

        // Finding 16: chuẩn hóa 'conversation' (số ít) — khớp test/seed/codebase.
        // Trước đây dùng 'conversations' (số nhiều) → 2 counter độc lập → trùng conversation_number.
        try {
            // Savepoint quanh INSERT: nếu đụng unique, Postgres abort cả transaction
            // (25P02) khiến re-fetch trong catch fail. DB::transaction() rollback chỉ
            // savepoint → connection còn dùng được cho re-fetch (an toàn cả khi ingest
            // chạy trong một transaction ngoài).
            return DB::transaction(function () use ($channel, $channelAccountId, $peerUid, $normalized) {
                $conversation = new Conversation([
                    'channel' => $channel,
                    'channel_account_id' => $channelAccountId,
                    'peer_uid' => $peerUid,
                    'thread_type' => $normalized['thread_type'] ?? 0,
                    'peer_name' => $normalized['peer_name'] ?? null,
                    'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
                    'peer_phone' => $normalized['peer_phone'] ?? null,
                    'conversation_number' => WorkspaceSequence::next('conversation'),
                    'contact_id' => null, // F23: Liên hệ nháp
                ]);
                $conversation->save();

                return $conversation;
            });
        } catch (QueryException $e) {
            // Race: 2 webhook cùng (channel_account_id, peer_uid) → cùng miss first() → cùng INSERT.
            // PostgreSQL unique-violation = SQLSTATE 23505 (conversations_channel_account_peer_unique).
            // Re-fetch row do request kia tạo, áp peer-info update như existing-row path.
            // Cùng pattern ContactService::firstOrCreateByPhone.
            if ($e->getCode() === '23505') {
                $conversation = $this->findConversation($channelAccountId, $peerUid);

                if ($conversation !== null) {
                    return $this->applyPeerUpdates($conversation, $normalized);
                }
            }

            throw $e;
        }
    }

    /**
     * Chỉ conversation ACTIVE (default SoftDeletes scope loại trừ trashed) — channel_account_id
     * KHÔNG đổi qua reconnect (khác zalo_connection_id cũ) nên KHÔNG dùng withTrashed(): 1
     * conversation đã soft-delete (opt-out F17/F26, hoặc merged-away duplicate) phải ở yên
     * ẩn, không "sống lại" chỉ vì peer nhắn tiếp — tin mới phải vào conversation active
     * (canonical sau merge), không phải bản đã ẩn.
     */
    protected function findConversation(?string $channelAccountId, string $peerUid): ?Conversation
    {
        return Conversation::where('channel_account_id', $channelAccountId)
            ->where('peer_uid', $peerUid)
            ->first();
    }

    /** @param array<string, mixed> $normalized */
    private function applyPeerUpdates(Conversation $conversation, array $normalized): Conversation
    {
        $updates = array_filter([
            'peer_name' => $normalized['peer_name'] ?? null,
            'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
            'peer_phone' => $normalized['peer_phone'] ?? null,
        ], fn ($v) => $v !== null);

        if ($updates !== []) {
            $conversation->fill($updates)->save();
        }

        return $conversation;
    }

    /** @param array<string, mixed> $normalized */
    private function upsertMessage(Conversation $conversation, array $normalized, string $direction): Message
    {
        $sourceId = $normalized['source_id'] ?? null;

        if ($sourceId === null) {
            // Không dedup được (không có platform msgId) → tạo mới
            return $this->createMessage($conversation, [
                'conversation_id' => $conversation->id,
                'direction' => $direction,
                'type' => $normalized['type'] ?? 'text',
                'body' => $normalized['body'] ?? null,
                'media_url' => $normalized['media_url'] ?? null,
                'media_meta' => $normalized['media_meta'] ?? [],
                'source_id' => null,
                'platform_sent_at' => $normalized['platform_sent_at'] ?? null,
                'sender_uid' => $normalized['sender_uid'] ?? null,
                'sender_name' => $normalized['sender_name'] ?? null,
                'sent_by' => $normalized['sent_by'] ?? null,
                'platform_meta' => $normalized['platform_meta'] ?? [],
            ]);
        }

        $existing = $this->findExistingBySource($conversation->id, $sourceId);

        if ($existing !== null) {
            // C-1: replay/backfill — KHÔNG ghi đè direction/sent_by/sender_uid (identity columns bất biến).
            // Chỉ fill field còn thiếu (vd media_url đến muộn). Chống lật outbound → inbound khi
            // history bridge trả is_self sai.
            $fillableIfNull = ['body', 'media_url', 'media_meta', 'platform_sent_at', 'sender_name'];
            foreach ($fillableIfNull as $col) {
                $newVal = $normalized[$col] ?? null;
                if (($existing->{$col} === null || $existing->{$col} === '') && $newVal !== null && $newVal !== '') {
                    $existing->{$col} = $newVal;
                }
            }

            // P01a: outbound portal chỉ lưu source_id (bridge response không có cliMsgId
            // và raw meta) — echo/self-listen quay về mang listener_data đầy đủ → MERGE
            // platform_meta vào row đã tạo để tin mình gửi quote/react được (Codex BLK-1).
            $newMeta = $normalized['platform_meta'] ?? [];
            if ($newMeta !== [] && ($existing->platform_meta ?? []) === []) {
                $existing->platform_meta = $newMeta;
            }

            if ($existing->isDirty()) {
                $existing->save();
            }

            return $existing;
        }

        return $this->createMessage($conversation, [
            'conversation_id' => $conversation->id,
            'source_id' => $sourceId,
            'direction' => $direction,
            'type' => $normalized['type'] ?? 'text',
            'body' => $normalized['body'] ?? null,
            'media_url' => $normalized['media_url'] ?? null,
            'media_meta' => $normalized['media_meta'] ?? [],
            'platform_sent_at' => $normalized['platform_sent_at'] ?? null,
            'sender_uid' => $normalized['sender_uid'] ?? null,
            'sender_name' => $normalized['sender_name'] ?? null,
            'sent_by' => $normalized['sent_by'] ?? null,
            'platform_meta' => $normalized['platform_meta'] ?? [],
        ]);
    }

    /**
     * P06 — replay/dedup: tra messages.source_id trực tiếp TRƯỚC, miss thì tra
     * message_source_aliases (giá trị source_id thay thế đã biết cho message hiện tại —
     * P01/P02e backfill mọi message legacy). 1 method DRY thay vì lặp 2 query rải rác.
     */
    private function findExistingBySource(string $conversationId, string $sourceId): ?Message
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
     * P05: mọi Message insert mới +1 conversations.stream_version (FE dùng để
     * biết khi nào cần refetch window quanh cursor — không đụng replay/no-op).
     *
     * @param  array<string, mixed>  $attrs
     */
    private function createMessage(Conversation $conversation, array $attrs): Message
    {
        $message = Message::create($attrs);
        Conversation::where('id', $conversation->id)->increment('stream_version');

        return $message;
    }

    private function updateConversationCache(Conversation $conversation, Message $message, string $direction): void
    {
        $updates = [
            'last_message_at' => $message->platform_sent_at ?? $message->created_at,
            'last_message_preview' => mb_substr((string) ($message->body ?? ''), 0, 100),
        ];

        if ($direction === 'in') {
            // ponytail: DB::raw để atomic increment, tránh race condition
            $conversation->increment('unread_count', 1, $updates);
        } else {
            $conversation->fill($updates)->save();
        }

        // Sync in-memory để broadcastWith() có data mới
        $conversation->refresh();
    }
}
