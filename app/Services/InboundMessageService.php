<?php

namespace App\Services;

use App\Events\MessageReceived;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WorkspaceSequence;
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
 *   zalo_connection_id?: string|null,
 *   connection_personal_uid?: string|null,
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
    public function __construct(private readonly MeteringService $meteringService) {}

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
                $this->meteringService->meterReply($conversation);
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
    protected function upsertConversation(array $normalized): Conversation
    {
        $channel = $normalized['channel'] ?? 'zalo_personal';
        $zaloConnectionId = $normalized['zalo_connection_id'] ?? null;
        $peerUid = $normalized['peer_uid'];
        $connectionPersonalUid = $normalized['connection_personal_uid'] ?? null;

        // Account-keyed (chống fork khi reconnect): connection_id đổi mỗi lần reconnect
        // nhưng personal_uid của tài khoản Zalo ổn định → tìm conversation hiện hữu của
        // peer này dưới BẤT KỲ connection nào cùng personal_uid. Né tạo conversation mới.
        if ($connectionPersonalUid !== null && $connectionPersonalUid !== '') {
            $byAccount = $this->findConversationByAccount($channel, $connectionPersonalUid, $peerUid);

            if ($byAccount !== null) {
                return $this->applyPeerUpdates($byAccount, $normalized);
            }
        }

        // Unique per (zalo_connection_id, peer_uid) — F14 idempotency
        $existing = $this->findConversation($zaloConnectionId, $peerUid);

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
            return DB::transaction(function () use ($channel, $zaloConnectionId, $peerUid, $normalized) {
                $conversation = new Conversation([
                    'channel' => $channel,
                    'zalo_connection_id' => $zaloConnectionId,
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
            // Race: 2 webhook cùng (zalo_connection_id, peer_uid) → cùng miss first() → cùng INSERT.
            // PostgreSQL unique-violation = SQLSTATE 23505 (conversations_channel_peer_unique).
            // Re-fetch row do request kia tạo, áp peer-info update như existing-row path.
            // Cùng pattern ContactService::firstOrCreateByPhone.
            if ($e->getCode() === '23505') {
                $conversation = $this->findConversation($zaloConnectionId, $peerUid);

                if ($conversation !== null) {
                    return $this->applyPeerUpdates($conversation, $normalized);
                }
            }

            throw $e;
        }
    }

    protected function findConversation(?string $zaloConnectionId, string $peerUid): ?Conversation
    {
        return Conversation::withTrashed()
            ->where('zalo_connection_id', $zaloConnectionId)
            ->where('peer_uid', $peerUid)
            ->first();
    }

    /**
     * Tìm conversation ACTIVE của peer dưới bất kỳ connection nào cùng personal_uid.
     * Join conversations.zalo_connection_id → zalo_connections.connection_id; KHÔNG lọc
     * zc.deleted_at (connection cũ đã trashed sau reconnect vẫn là cùng tài khoản).
     * Chỉ lấy conversation chưa soft-delete; nếu trùng nhiều → ưu tiên connection mới nhất
     * (conversation.zalo_connection_id lớn nhất = slot reconnect gần nhất).
     */
    protected function findConversationByAccount(string $channel, string $personalUid, string $peerUid): ?Conversation
    {
        return Conversation::query()
            ->where('conversations.channel', $channel)
            ->where('conversations.peer_uid', $peerUid)
            ->whereIn('conversations.zalo_connection_id', function ($q) use ($personalUid) {
                $q->select('connection_id')
                    ->from('zalo_connections')
                    ->where('personal_uid', $personalUid);
            })
            ->orderByDesc('conversations.zalo_connection_id')
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
            return Message::create([
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

        $existing = Message::where('conversation_id', $conversation->id)
            ->where('source_id', $sourceId)
            ->first();

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
            if ($existing->isDirty()) {
                $existing->save();
            }

            return $existing;
        }

        return Message::create([
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
        ]);
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
