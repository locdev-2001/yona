<?php

namespace App\Services;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;

/**
 * Gộp conversation bị fork khi reconnect Zalo cá nhân.
 *
 * Bối cảnh: conversations unique trên (zalo_connection_id, peer_uid). Mỗi lần reconnect
 * mint connection_id mới → cùng peer sinh conversation row mới → thread bị nhân đôi.
 *
 * Connection được caller chọn:
 *  - promote() (web, đã bind RLS workspace) → default connection (RLS enforce scope)
 *  - command CLI (không có RLS) → pgsql_privileged
 * Mọi query đều lọc workspace_id tường minh → an toàn cả 2 đường.
 * Idempotent: gọi lại trên data đã gộp = no-op.
 *
 * Dùng bởi:
 *  - ZaloConnectionController::promote() — gộp old connection → new khi reconnect
 *  - MergeDuplicateZaloConversations command — dọn dup cũ đã tồn tại trong DB
 */
class ZaloConversationMerger
{
    private ConnectionInterface $db;

    public function __construct(?string $connection = null)
    {
        $this->db = DB::connection($connection);
    }

    public function on(string $connection): self
    {
        return new self($connection);
    }

    /**
     * Gộp tất cả conversation của $sourceCid (cùng workspace) vào slot $targetCid.
     * Mỗi conversation:
     *   - đã có conversation cùng peer_uid dưới $targetCid → MERGE message + soft-delete nguồn rỗng
     *   - chưa có → re-point zalo_connection_id sang $targetCid
     *
     * Trả về số conversation đã xử lý (re-point + merge).
     */
    public function mergeConnection(string $workspaceId, int $sourceCid, int $targetCid): int
    {
        if ($sourceCid === $targetCid) {
            return 0;
        }

        $sources = $this->db->table('conversations')
            ->where('workspace_id', $workspaceId)
            ->where('zalo_connection_id', $sourceCid)
            ->get(['id', 'peer_uid']);

        $processed = 0;

        foreach ($sources as $source) {
            $target = $this->db->table('conversations')
                ->where('workspace_id', $workspaceId)
                ->where('zalo_connection_id', $targetCid)
                ->where('peer_uid', $source->peer_uid)
                ->first(['id']);

            if ($target === null) {
                // Không có conversation đích → re-point (đổi connection_id của row nguồn)
                $this->db->table('conversations')
                    ->where('id', $source->id)
                    ->update([
                        'zalo_connection_id' => $targetCid,
                        'deleted_at' => null, // hồi sinh nếu nguồn đã soft-delete khi disconnect
                        'updated_at' => now(),
                    ]);
            } else {
                $this->mergeConversation((string) $source->id, (string) $target->id);
            }

            $processed++;
        }

        return $processed;
    }

    /**
     * Di chuyển message từ conversation $sourceId sang $targetId, tôn trọng unique
     * (conversation_id, source_id), rồi soft-delete conversation nguồn + recompute đích.
     */
    public function mergeConversation(string $sourceId, string $targetId): void
    {
        if ($sourceId === $targetId) {
            return;
        }

        $this->db->transaction(function () use ($sourceId, $targetId) {
            // source_id đã tồn tại dưới đích → bỏ qua để né 23505 (messages_conv_source_unique)
            $existingSourceIds = $this->db->table('messages')
                ->where('conversation_id', $targetId)
                ->whereNotNull('source_id')
                ->pluck('source_id')
                ->all();

            $moveQuery = $this->db->table('messages')
                ->where('conversation_id', $sourceId);

            if ($existingSourceIds !== []) {
                // Chỉ chuyển message KHÔNG đụng source_id đích (null source_id chuyển tự do)
                $moveQuery->where(function ($q) use ($existingSourceIds) {
                    $q->whereNull('source_id')
                        ->orWhereNotIn('source_id', $existingSourceIds);
                });
            }

            $moveQuery->update([
                'conversation_id' => $targetId,
                'updated_at' => now(),
            ]);

            $this->recomputeCache($targetId);

            // Conversation nguồn giờ trống (message đã chuyển / duplicate đã ở đích) → soft-delete
            $this->db->table('conversations')
                ->where('id', $sourceId)
                ->update(['deleted_at' => now(), 'updated_at' => now()]);
        });
    }

    /**
     * Tính lại last_message_at / last_message_preview / unread_count cho conversation đích.
     * Khớp convention InboundMessageService: preview = 100 ký tự đầu của body,
     * last_message_at = platform_sent_at ?? created_at, unread = số message direction='in'.
     */
    private function recomputeCache(string $conversationId): void
    {
        $latest = $this->db->table('messages')
            ->where('conversation_id', $conversationId)
            ->orderByRaw('COALESCE(platform_sent_at, created_at) DESC')
            ->first(['body', 'platform_sent_at', 'created_at']);

        if ($latest === null) {
            return; // target trống (không xảy ra trong luồng merge thực tế) — không có gì để recompute
        }

        $unread = $this->db->table('messages')
            ->where('conversation_id', $conversationId)
            ->where('direction', 'in')
            ->count();

        $this->db->table('conversations')
            ->where('id', $conversationId)
            ->update([
                'last_message_at' => $latest->platform_sent_at ?? $latest->created_at,
                'last_message_preview' => mb_substr((string) ($latest->body ?? ''), 0, 100),
                'unread_count' => $unread,
                'updated_at' => now(),
            ]);
    }
}
