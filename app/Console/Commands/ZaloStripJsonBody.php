<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Dọn một lần: tin media/sticker backfill CŨ còn body = raw JSON content (bug 11/07,
 * trước fix buildGroupBackfillPayload dùng parseInboundDescriptor). type + media_url +
 * media_meta ĐÚNG rồi — chỉ body chứa JSON rác hiển thị làm caption → làm rỗng.
 * Idempotent: chạy lại không hại. Kết nối privileged để phủ mọi workspace (bỏ RLS).
 */
class ZaloStripJsonBody extends Command
{
    protected $signature = 'zalo:strip-json-body';

    protected $description = 'Làm rỗng body JSON rác của tin media/sticker backfill cũ';

    public function handle(): int
    {
        $affected = DB::connection('pgsql_privileged')
            ->table('messages')
            ->whereIn('type', ['file', 'image', 'video', 'gif', 'audio', 'sticker'])
            ->where('body', 'like', '{%')
            ->update(['body' => '']);

        $this->info("Đã dọn body JSON cho {$affected} tin media/sticker.");

        return self::SUCCESS;
    }
}
