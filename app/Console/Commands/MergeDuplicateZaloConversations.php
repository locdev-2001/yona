<?php

namespace App\Console\Commands;

use App\Services\ZaloConversationMerger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-time (idempotent) dọn conversation Zalo bị fork do reconnect trước khi có fix.
 *
 * Một peer xuất hiện nhiều conversation khi các connection khác nhau (connection_id khác)
 * cùng trỏ về một tài khoản Zalo (cùng personal_uid). Lệnh gộp về 1 conversation duy nhất:
 *   - đích = conversation dưới connection đang active (state=connected, chưa soft-delete)
 *   - không có active → conversation mới nhất (created_at lớn nhất)
 *
 * Chạy được nhiều lần — sau khi gộp xong, group không còn >1 → no-op.
 */
class MergeDuplicateZaloConversations extends Command
{
    protected $signature = 'zalo:merge-duplicate-conversations {--dry-run : Chỉ in nhóm trùng, không gộp}';

    protected $description = 'Gộp conversation Zalo cá nhân bị nhân đôi do reconnect (cùng personal_uid + peer_uid).';

    public function handle(ZaloConversationMerger $merger): int
    {
        // CLI không có RLS context → dùng privileged cho cả đọc nhóm lẫn ghi merge.
        $merger = $merger->on('pgsql_privileged');

        $groups = DB::connection('pgsql_privileged')->select("
            SELECT c.workspace_id, zc.personal_uid, c.peer_uid, COUNT(*) AS conv_count
            FROM conversations c
            JOIN zalo_connections zc ON zc.connection_id = c.zalo_connection_id
            WHERE c.channel = 'zalo_personal' AND c.deleted_at IS NULL
            GROUP BY c.workspace_id, zc.personal_uid, c.peer_uid
            HAVING COUNT(*) > 1
        ");

        if ($groups === []) {
            $this->info('Không có conversation trùng nào cần gộp.');

            return self::SUCCESS;
        }

        $this->line('Tìm thấy '.count($groups).' nhóm peer bị trùng.');

        $mergedConversations = 0;

        foreach ($groups as $group) {
            $convs = DB::connection('pgsql_privileged')->select('
                SELECT c.id, c.zalo_connection_id, c.created_at, zc.state, zc.deleted_at AS conn_deleted_at
                FROM conversations c
                JOIN zalo_connections zc ON zc.connection_id = c.zalo_connection_id
                WHERE c.workspace_id = ? AND c.channel = ? AND c.peer_uid = ?
                  AND zc.personal_uid = ? AND c.deleted_at IS NULL
                ORDER BY c.created_at DESC
            ', [$group->workspace_id, 'zalo_personal', $group->peer_uid, $group->personal_uid]);

            // Đích: conversation dưới connection active (connected + chưa soft-delete) nếu có,
            // không thì conversation mới nhất (đầu list vì ORDER BY created_at DESC).
            $target = null;
            foreach ($convs as $conv) {
                if ($conv->state === 'connected' && $conv->conn_deleted_at === null) {
                    $target = $conv;
                    break;
                }
            }
            $target ??= $convs[0];

            if ($this->option('dry-run')) {
                $this->line("  peer={$group->peer_uid}: ".count($convs)." conv → đích cid={$target->zalo_connection_id}");

                continue;
            }

            foreach ($convs as $conv) {
                if ($conv->id === $target->id) {
                    continue;
                }
                $merger->mergeConversation((string) $conv->id, (string) $target->id);
                $mergedConversations++;
            }
        }

        if ($this->option('dry-run')) {
            $this->info('Dry-run: không thay đổi dữ liệu.');

            return self::SUCCESS;
        }

        $this->info("Đã gộp {$mergedConversations} conversation trùng vào conversation đích.");

        return self::SUCCESS;
    }
}
