<?php

namespace App\Modules\Chat\Intake;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Broadcast\BroadcastService;
use App\Modules\Chat\Status\MessageStatusService;
use App\Modules\Chat\Store\GapMarkerService;
use App\Modules\Chat\Store\MemberStore;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;
use App\Services\MeteringService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Channel-agnostic inbound message ingestor (F2, F13, F14, F20).
 *
 * Caller (channel webhook) bind RLS TenantScope TRƯỚC khi gọi ingest().
 * Service này KHÔNG biết kênh cụ thể — nhận normalized payload đã parse.
 *
 * Nguyên tắc bất biến:
 *  F13/F20: LUÔN ghi Conversation+Message — inbound không bao giờ bị chặn.
 *  F14:     direction='in' (default fail-safe khi thiếu field) — KHÔNG meter.
 *           direction='out' → meterReply() trong try/catch (fail-safe: lỗi đếm KHÔNG chặn ghi tin).
 *  F14 idempotency: updateOrCreate theo (conversation_id, source_id) — trùng source_id = no-op.
 *
 * @param array{
 *   channel_account_id?: string|null,
 *   channel?: string,
 *   thread_uid: string,
 *   thread_kind?: string,
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
 *   sender_avatar?: string|null,
 *   sent_by?: int|null,
 *   platform_meta?: array<string, mixed>,
 * } $normalized
 */
class IntakeService
{
    public function __construct(
        private readonly MeteringService $meteringService,
        private readonly GapMarkerService $gapMarker,
        private readonly DuplicateResolver $sourceResolver,
        private readonly MessageStatusService $messageStateService,
        private readonly BroadcastService $broadcast,
        private readonly MemberStore $members,
        private readonly IdentityResolver $identities,
    ) {}

    public function ingest(array $normalized): Message
    {
        // --- Upsert Conversation ---
        $conversation = $this->upsertConversation($normalized);

        // --- Ai vừa xuất hiện trong luồng ---
        // Với nhóm, người gửi là một thành viên; với 1-1 thì chính là đối phương.
        // Cả hai đều được ghi thành một hàng thành viên: một đường trả lời duy nhất
        // cho câu "người này ở đâu".
        $memberUid = $normalized['sender_uid'] ?? ($conversation->isGroup() ? null : $conversation->sender_uid);

        if ($memberUid !== null && $memberUid !== '') {
            $this->members->remember(
                $conversation,
                (string) $memberUid,
                $conversation->channel,
                $normalized['sender_name'] ?? ($conversation->isGroup() ? null : $normalized['peer_name'] ?? null),
                $normalized['sender_avatar'] ?? ($conversation->isGroup() ? null : $normalized['peer_avatar'] ?? null),
            );
        }

        // --- Direction fail-safe (F14): default 'in' nếu không có field ---
        $direction = $normalized['direction'] ?? 'in';

        // --- P05: gap marker TRƯỚC khi message post-gap "visible" (chokepoint) ---
        $gapMarked = $this->gapMarker->materializeIfNeeded($conversation, $normalized['platform_sent_at'] ?? null);

        // --- Upsert Message (idempotent per source_id) ---
        $message = $this->upsertMessage($conversation, $normalized, $direction);

        // --- Thống kê outbound (F1) — fail-safe, lỗi KHÔNG chặn ghi tin ---
        if ($direction === 'out') {
            try {
                $this->meteringService->meterReply($conversation);
            } catch (\Throwable) {
                // ponytail: fail-safe F13/F20 — lỗi đếm không chặn ghi/broadcast
            }
        }

        // --- Cache hội thoại + broadcast realtime (BroadcastService — dùng chung outbound pipeline) ---
        $this->broadcast->publish($conversation, $message, $direction, $gapMarked);

        return $message;
    }

    /**
     * P08 — 1 path duy nhất: key (channel_account_id, sender_uid). channel_account_id
     * ổn định qua reconnect (không như zalo_connection_id cũ, đổi mỗi lần reconnect) —
     * không còn cần findConversationByAccount/dedupe riêng cho case reconnect.
     *
     * @param  array<string, mixed>  $normalized
     */
    protected function upsertConversation(array $normalized): Conversation
    {
        // sẽ meter sai kênh IM LẶNG (phá per-channel). Fail-loud → webhook 422 dead-letter.
        $threadKind = $normalized['thread_kind'] ?? Conversation::KIND_DIRECT;
        $channel = $normalized['channel'] ?? throw new \InvalidArgumentException('normalized payload thiếu key channel — driver phải set channelKey');
        $channelAccountId = $normalized['channel_account_id'] ?? null;
        // Khóa của LUỒNG, không phải của người gửi tin: với nhóm thì đây là
        // định danh nhóm. Cột nhận nó tên `sender_uid` theo schema đích.
        $senderUid = $normalized['thread_uid'];

        $existing = $this->findConversation($channelAccountId, $senderUid);

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
            return DB::transaction(function () use ($channel, $channelAccountId, $senderUid, $normalized, $threadKind) {
                $conversation = new Conversation([
                    'channel' => $channel,
                    'channel_account_id' => $channelAccountId,
                    'sender_uid' => $senderUid,
                    'thread_kind' => $threadKind,
                    'peer_name' => $normalized['peer_name'] ?? null,
                    'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
                    'peer_phone' => $normalized['peer_phone'] ?? null,
                    // Nhóm: tên thật của nhóm. 1-1: bản cache tên người, làm mới mỗi tin đến.
                    'thread_name' => $normalized['peer_name'] ?? null,
                    'thread_avatar' => $normalized['peer_avatar'] ?? null,
                    'conversation_number' => WorkspaceSequence::next('conversation'),
                    'contact_id' => null, // F23: Liên hệ nháp
                ]);
                $conversation->save();
                $this->linkThreadIdentity($conversation, $normalized);

                return $conversation;
            });
        } catch (QueryException $e) {
            // Race: 2 webhook cùng (channel_account_id, sender_uid) → cùng miss first() → cùng INSERT.
            // PostgreSQL unique-violation = SQLSTATE 23505 (conversations_channel_account_peer_unique).
            // Re-fetch row do request kia tạo, áp peer-info update như existing-row path.
            // Cùng pattern ContactService::firstOrCreateByPhone.
            if ($e->getCode() === '23505') {
                $conversation = $this->findConversation($channelAccountId, $senderUid);

                if ($conversation !== null) {
                    return $this->applyPeerUpdates($conversation, $normalized);
                }
            }

            throw $e;
        }
    }

    /**
     * Gắn luồng vào tầng định danh — CHỈ với luồng 1-1.
     *
     * Nhóm KHÔNG đẻ danh tính: một nhóm có uid nhưng không phải một con người.
     * Tên và avatar nhóm sống trên chính luồng. Đây là chỗ DUY NHẤT mô hình
     * không đối xứng, ghi rõ ở đây để không ai "sửa cho đều" về sau.
     *
     * @param  array<string, mixed>  $normalized
     */
    protected function linkThreadIdentity(Conversation $conversation, array $normalized): void
    {
        if ($conversation->isGroup()) {
            return;
        }

        $resolved = $this->identities->observe(new ObservedIdentity(
            workspaceId: $conversation->workspace_id,
            key: $conversation->channel.'_uid',
            value: $conversation->sender_uid,
            source: $conversation->channel,
            channelAccountId: $conversation->channel_account_id,
            displayName: $normalized['peer_name'] ?? null,
            avatarUrl: $normalized['peer_avatar'] ?? null,
            channels: [$conversation->channel],
        ));

        $conversation->forceFill([
            'identity_id' => $resolved->identityId,
            'profile_id' => $resolved->profileId,
        ])->save();
    }

    /**
     * Chỉ conversation ACTIVE (default SoftDeletes scope loại trừ trashed) — channel_account_id
     * KHÔNG đổi qua reconnect (khác zalo_connection_id cũ) nên KHÔNG dùng withTrashed(): 1
     * conversation đã soft-delete (opt-out F17/F26, hoặc merged-away duplicate) phải ở yên
     * ẩn, không "sống lại" chỉ vì peer nhắn tiếp — tin mới phải vào conversation active
     * (canonical sau merge), không phải bản đã ẩn.
     */
    protected function findConversation(?string $channelAccountId, string $senderUid): ?Conversation
    {
        return Conversation::where('channel_account_id', $channelAccountId)
            ->where('sender_uid', $senderUid)
            ->first();
    }

    /** @param array<string, mixed> $normalized */
    private function applyPeerUpdates(Conversation $conversation, array $normalized): Conversation
    {
        $updates = array_filter([
            'peer_name' => $normalized['peer_name'] ?? null,
            'peer_avatar_url' => $normalized['peer_avatar'] ?? null,
            'peer_phone' => $normalized['peer_phone'] ?? null,
            'thread_name' => $normalized['peer_name'] ?? null,
            'thread_avatar' => $normalized['peer_avatar'] ?? null,
        ], fn ($v) => $v !== null);

        if ($updates !== []) {
            $conversation->fill($updates)->save();
        }

        // Luồng cũ có từ trước tầng định danh thì chưa có khóa — gắn lúc gặp lại.
        if ($conversation->profile_id === null) {
            $this->linkThreadIdentity($conversation, $normalized);
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
            // history bridge trả is_self sai. media_meta cast array → [] cũng là "thiếu".
            $fillableIfNull = ['body', 'media_url', 'media_meta', 'platform_sent_at', 'sender_name'];
            foreach ($fillableIfNull as $col) {
                $newVal = $normalized[$col] ?? null;
                if (($existing->{$col} === null || $existing->{$col} === '' || $existing->{$col} === []) && $newVal !== null && $newVal !== '' && $newVal !== []) {
                    $existing->{$col} = $newVal;
                }
            }

            // Content-type upgrade: tin từng ingest khi parser chưa nhận ra loại (ghi 'text'
            // + nhãn placeholder) — replay mang type giàu hơn (bank_card...) thì nâng cấp,
            // kèm media_meta mới nếu row cũ chưa có. Không phải identity column (C-1),
            // và không bao giờ hạ cấp type khác về text.
            $incomingType = $normalized['type'] ?? 'text';
            if ($existing->type === 'text' && $incomingType !== 'text') {
                $existing->type = $incomingType;
                $newMeta = $normalized['media_meta'] ?? [];
                if ($newMeta !== []) {
                    $existing->media_meta = array_merge($existing->media_meta ?? [], $newMeta);
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
     * P06 — replay/dedup theo source_id (P02 tách ra DuplicateResolver dùng
     * chung với message-state events).
     */
    private function findExistingBySource(string $conversationId, string $sourceId): ?Message
    {
        return $this->sourceResolver->find($conversationId, $sourceId);
    }

    /**
     * P05: mọi Message insert mới +1 conversations.stream_version (FE dùng để
     * biết khi nào cần refetch window quanh cursor — không đụng replay/no-op).
     *
     * P02: sau insert, quét pending_message_states khớp source_id — undo đến
     * TRƯỚC tin (race event-trước-tin) được áp lại tại đây. Fail-safe: lỗi
     * pending KHÔNG chặn ingest (F13/F20).
     *
     * @param  array<string, mixed>  $attrs
     */
    private function createMessage(Conversation $conversation, array $attrs): Message
    {
        $message = Message::create($attrs);
        Conversation::where('id', $conversation->id)->increment('stream_version');

        try {
            $this->messageStateService->applyPendingFor($message);
        } catch (\Throwable) {
            // ponytail: fail-safe — pending state lỗi không được chặn ghi tin
        }

        return $message;
    }
}
