<?php

namespace Modules\Inbox\Services;

use Modules\Inbox\Contracts\MeteringGate;
use Modules\Inbox\Events\MessageReceived;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;
use Modules\Tenancy\Models\WorkspaceSequence;

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
 *   zalo_connection_id?: string|null,
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
 * } $normalized
 */
class InboundMessageService
{
    public function __construct(private readonly MeteringGate $meteringGate) {}

    public function ingest(array $normalized): Message
    {
        // --- Upsert Conversation ---
        $conversation = $this->upsertConversation($normalized);

        // --- Direction fail-safe (F14): default 'in' nếu không có field ---
        $direction = $normalized['direction'] ?? 'in';

        // --- Upsert Message (idempotent per source_id) ---
        $message = $this->upsertMessage($conversation, $normalized, $direction);

        // --- Update conversation cache ---
        $this->updateConversationCache($conversation, $message, $direction);

        // --- Meter outbound (F1) — fail-safe, lỗi KHÔNG chặn ---
        if ($direction === 'out') {
            try {
                $this->meteringGate->meterReply($conversation);
            } catch (\Throwable) {
                // ponytail: fail-safe F13/F20 — lỗi gate không chặn ghi/broadcast
            }
        }

        // --- Broadcast realtime ---
        // Reload conversation để payload broadcastWith() có last_message_at mới nhất
        $message->setRelation('conversation', $conversation->fresh() ?? $conversation);
        event(new MessageReceived($message));

        return $message;
    }

    /** @param array<string, mixed> $normalized */
    private function upsertConversation(array $normalized): Conversation
    {
        $channel = $normalized['channel'] ?? 'zalo_personal';
        $zaloConnectionId = $normalized['zalo_connection_id'] ?? null;
        $peerUid = $normalized['peer_uid'];

        // Unique per (zalo_connection_id, peer_uid) — F14 idempotency
        $conversation = Conversation::withTrashed()
            ->where('zalo_connection_id', $zaloConnectionId)
            ->where('peer_uid', $peerUid)
            ->first();

        if ($conversation === null) {
            // Finding 16: chuẩn hóa 'conversation' (số ít) — khớp test/seed/codebase.
            // Trước đây dùng 'conversations' (số nhiều) → 2 counter độc lập → trùng conversation_number.
            $conversationNumber = WorkspaceSequence::next('conversation');

            $conversation = new Conversation([
                'channel' => $channel,
                'zalo_connection_id' => $zaloConnectionId,
                'peer_uid' => $peerUid,
                'thread_type' => $normalized['thread_type'] ?? 0,
                'peer_name' => $normalized['peer_name'] ?? null,
                'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
                'peer_phone' => $normalized['peer_phone'] ?? null,
                'conversation_number' => $conversationNumber,
                'contact_id' => null, // F23: Liên hệ nháp
            ]);
            $conversation->save();
        } else {
            // Cập nhật peer info nếu thay đổi
            $updates = array_filter([
                'peer_name' => $normalized['peer_name'] ?? null,
                'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
                'peer_phone' => $normalized['peer_phone'] ?? null,
            ], fn ($v) => $v !== null);

            if ($updates !== []) {
                $conversation->fill($updates)->save();
            }
        }

        return $conversation;
    }

    /** @param array<string, mixed> $normalized */
    private function upsertMessage(Conversation $conversation, array $normalized, string $direction): Message
    {
        $sourceId = $normalized['source_id'] ?? null;

        // Idempotent: updateOrCreate theo (conversation_id, source_id) — F14
        // source_id null → tạo mới (không dedup, không có platform msgId)
        if ($sourceId !== null) {
            $message = Message::updateOrCreate(
                [
                    'conversation_id' => $conversation->id,
                    'source_id' => $sourceId,
                ],
                [
                    'direction' => $direction,
                    'type' => $normalized['type'] ?? 'text',
                    'body' => $normalized['body'] ?? null,
                    'media_url' => $normalized['media_url'] ?? null,
                    'media_meta' => $normalized['media_meta'] ?? [],
                    'platform_sent_at' => $normalized['platform_sent_at'] ?? null,
                    'sender_uid' => $normalized['sender_uid'] ?? null,
                    'sender_name' => $normalized['sender_name'] ?? null,
                    'sent_by' => $normalized['sent_by'] ?? null,
                ]
            );
        } else {
            $message = Message::create([
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
            ]);
        }

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
