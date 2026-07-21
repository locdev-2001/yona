<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * P04/P02 — inbox:prune-transient: giữ các bảng tạm BOUNDED (goal #3 — không bảng
 * nào phình vô hạn). Chạy daily (routes/console.php). Cross-workspace → pgsql_privileged
 * (system command, không có tenant context — pattern webhook resolve).
 *
 * 1. pending_message_states: xóa row expires_at đã qua (TTL 48h set lúc insert).
 * 2. attachments morph 'conversation' upload rồi KHÔNG gửi (không message nào tham
 *    chiếu media_meta.attachment_id) quá TTL → xóa file + xóa row (PII không nằm
 *    lại vô hạn trên disk — A3). Attachment ĐÃ gửi giữ nguyên (lịch sử chat).
 */
class PruneInboxTransient extends Command
{
    protected $signature = 'inbox:prune-transient';

    protected $description = 'Prune expired pending message states + unsent inbox attachments';

    private const UNSENT_ATTACHMENT_TTL_HOURS = 48;

    public function handle(): int
    {
        $db = DB::connection('pgsql_privileged');

        $prunedStates = $db->table('pending_message_states')
            ->where('expires_at', '<', now())
            ->delete();

        $cutoff = now()->subHours(self::UNSENT_ATTACHMENT_TTL_HOURS);

        $orphans = $db->table('attachments')
            ->where('attachable_type', 'conversation')
            ->where('created_at', '<', $cutoff)
            ->whereNull('deleted_at')
            ->whereNotNull('path')
            ->whereRaw("NOT EXISTS (
                SELECT 1 FROM messages m
                WHERE m.media_meta->>'attachment_id' = attachments.id::text
            )")
            ->get(['id', 'path']);

        $disk = Storage::disk(config('filesystems.default'));
        foreach ($orphans as $orphan) {
            $disk->delete($orphan->path);
            $db->table('attachments')->where('id', $orphan->id)->update(['deleted_at' => now()]);
        }

        $this->info("Pruned {$prunedStates} pending states, {$orphans->count()} unsent attachments.");

        return self::SUCCESS;
    }
}
