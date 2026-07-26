<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P02(g) (inbox-multichannel-relayer) — swap unique conversations sang
 * (channel_account_id, peer_uid), drop zalo_connection_id.
 *
 * *** HOÃN — KHÔNG chạy migration này cho tới khi ***:
 *   1. P03 (outbound) đã đổi ZaloSendService::resolveConnection sang
 *      channel_account_id (nếu không, gửi tin sẽ gãy ngay khi cột bị drop).
 *   2. P06 (source_id contract) alias-lookup live trong IntakeService
 *      (nếu không, ingest có thể tạo message trùng khi replay legacy source_id).
 * Đây là 2 điều kiện CODE (không tự query DB được) — enforce bằng thứ tự thực
 * thi plan, KHÔNG chạy `php artisan migrate` cho riêng file này sớm.
 *
 * Gate DATA (tự kiểm trong up(), abort nếu fail):
 *   - alias coverage 100% (mọi messages.source_id NOT NULL đều có alias)
 *   - 0 lead_merge_conflicts chưa resolve
 * CẢNH BÁO: data gate đã PASS ngay từ lúc P02(a-f) xong (coverage 100%, 0
 * conflict) — nghĩa là gate DATA sẽ KHÔNG chặn nếu file này lỡ bị `php
 * artisan migrate` gom chạy chung (vd. lúc thêm cột stream_version P05).
 * BẮT BUỘC dùng `--path=database/migrations/<file>.php` cho MỌI migration
 * từ P03 tới P06 để tránh vô tình kéo migration này chạy sớm. Chỉ chạy file
 * này bằng `--path=` tường minh, sau khi tự tay xác nhận P03+P06 xong.
 *
 * CREATE UNIQUE INDEX CONCURRENTLY không chạy được trong transaction →
 * $withinTransaction = false (forward-only, down() cũng ngoài transaction).
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');

        $uncovered = (int) $db->selectOne(
            'SELECT COUNT(*) AS cnt FROM messages m
             WHERE m.source_id IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM message_source_aliases a
                 WHERE a.conversation_id = m.conversation_id AND a.source_id = m.source_id
               )'
        )->cnt;

        if ($uncovered > 0) {
            throw new RuntimeException("Swap (g) abort: {$uncovered} message source_id chưa có alias. Chạy `php artisan inbox:rekey-channel-account --backfill` trước.");
        }

        $unresolvedConflicts = (int) $db->table('lead_merge_conflicts')->whereNull('resolved_at')->count();

        if ($unresolvedConflicts > 0) {
            throw new RuntimeException("Swap (g) abort: {$unresolvedConflicts} lead_merge_conflicts chưa resolve. Xử lý tay bảng lead_merge_conflicts trước.");
        }

        // Partial unique chống split-brain: đúng 1 slot connected/account (spike: BẮT BUỘC deleted_at IS NULL).
        $db->statement(
            'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS zalo_connections_account_connected_unique
             ON zalo_connections (channel_account_id) WHERE state = \'connected\' AND deleted_at IS NULL'
        );

        // conversations soft-delete (F17/F26) — PHẢI partial (WHERE deleted_at IS NULL), như
        // constraint cũ zalo_connections_ws_personal_uid_active_unique. Không có predicate này,
        // 1 conversation cũ đã soft-delete (vd merge trước đây) mãi mãi đụng constraint với
        // conversation active cùng (channel_account_id, peer_uid) — build CONCURRENTLY fail,
        // để lại 1 index INVALID (retry phải drop trước, IF NOT EXISTS không tự sửa index hỏng).
        $db->statement('DROP INDEX CONCURRENTLY IF EXISTS conversations_channel_account_peer_unique');
        $db->statement(
            'CREATE UNIQUE INDEX CONCURRENTLY conversations_channel_account_peer_unique
             ON conversations (channel_account_id, peer_uid) WHERE deleted_at IS NULL'
        );

        $db->statement('ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_channel_peer_unique');
        $db->statement('ALTER TABLE conversations DROP COLUMN IF EXISTS zalo_connection_id');
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        $db->statement('ALTER TABLE conversations ADD COLUMN zalo_connection_id bigint NULL');
        $db->statement(
            'ALTER TABLE conversations ADD CONSTRAINT conversations_channel_peer_unique UNIQUE (zalo_connection_id, peer_uid)'
        );
        $db->statement('DROP INDEX CONCURRENTLY IF EXISTS conversations_channel_account_peer_unique');
        $db->statement('DROP INDEX CONCURRENTLY IF EXISTS zalo_connections_account_connected_unique');
    }
};
