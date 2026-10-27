<?php

namespace App\Console\Commands;

use App\Jobs\Attachments\GenerateAttachmentThumbnailJob;
use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Console\Command;

/**
 * Dựng ảnh thu nhỏ (và bù kích thước) cho ảnh đính kèm có từ trước khi có bước
 * này. Chạy đồng bộ ngay trong lệnh, cùng một job với ảnh mới; ảnh đã xử lý mang
 * `meta.thumb` nên chạy lại nhiều lần không làm gì thêm.
 */
class GenerateAttachmentThumbnails extends Command
{
    protected $signature = 'attachments:generate-thumbnails
        {--chunk=200 : Số ảnh mỗi lượt đọc DB}';

    protected $description = 'Dựng ảnh thu nhỏ WebP cho ảnh đính kèm tin nhắn chưa có';

    public function handle(): int
    {
        $processed = 0;

        Attachment::query()
            ->where('attachable_type', (new Message)->getMorphClass())
            ->where('file_type', Attachment::FILE_TYPE_IMAGE)
            ->whereNotNull('path')
            ->whereNotIn('disk', (array) config('yona.attachment_borrowed_disks', []))
            ->whereRaw("NOT jsonb_exists(COALESCE(meta::jsonb, '{}'::jsonb), ?)", [Attachment::META_THUMBNAIL])
            ->chunkById(max(1, (int) $this->option('chunk')), function ($attachments) use (&$processed) {
                foreach ($attachments as $attachment) {
                    GenerateAttachmentThumbnailJob::dispatchSync($attachment);
                    $processed++;
                }
                $this->line("  đã xử lý {$processed} ảnh");
            });

        $this->components->info("Đã xử lý {$processed} ảnh đính kèm.");

        return self::SUCCESS;
    }
}
