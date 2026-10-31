<?php

namespace App\Console\Commands;

use App\Jobs\Attachments\RetryAttachmentDownloadJob;
use App\Models\Attachment;
use App\Services\Zalo\ZaloPhotoUrl;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Ảnh Zalo tải hỏng trước khi driver khai bản JPEG XL thay thế chỉ còn đính kèm
 * dự phòng mang link `.jpg` mà CDN trả 500, nên lượt tải lại nền không bao giờ lành.
 * Lệnh gắn bản thay thế vào dấu tải lại rồi tải ngay bằng chính job tải lại; ảnh
 * vẫn hỏng thì job tự hẹn các lượt sau. Chạy lại nhiều lần không đổi gì thêm.
 */
class RetryZaloPhotoDownloads extends Command
{
    private const CHUNK_SIZE = 100;

    protected $signature = 'attachments:retry-zalo-photos
        {--dry-run : Chỉ in id sẽ tải lại, không ghi gì}';

    protected $description = 'Tải lại ảnh Zalo đang ở dạng dự phòng qua bản JPEG XL thay thế';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $restored = 0;
        $stillBroken = 0;

        $this->candidates()->chunkById(self::CHUNK_SIZE, function ($attachments) use ($dryRun, &$restored, &$stillBroken) {
            foreach ($attachments as $attachment) {
                $alternativeUrls = ZaloPhotoUrl::alternativesFor((string) $attachment->external_url);

                if ($alternativeUrls === []) {
                    continue;
                }

                if ($dryRun) {
                    $this->line(sprintf('  #%d  account %d', $attachment->id, $attachment->account_id));

                    continue;
                }

                $attachment->update(['meta' => [
                    ...($attachment->meta ?? []),
                    Attachment::META_DOWNLOAD_RETRY => [
                        'reported_file_type' => $attachment->reportedFileTypeForRetry() ?? Attachment::FILE_TYPE_IMAGE,
                        'alternative_urls' => $alternativeUrls,
                    ],
                ]]);

                RetryAttachmentDownloadJob::dispatchSync($attachment);

                $isRestored = $attachment->fresh()?->hasFile() === true;
                $isRestored ? $restored++ : $stillBroken++;
                $this->line(sprintf('  #%d  account %d  %s', $attachment->id, $attachment->account_id, $isRestored ? 'đã tải' : 'vẫn hỏng'));
            }
        });

        $this->components->info($dryRun
            ? 'Thử chạy xong, chưa ghi gì.'
            : "Đã tải {$restored} ảnh, còn {$stillBroken} ảnh hỏng (job tự thử lại các lượt sau).");

        return self::SUCCESS;
    }

    private function candidates(): Builder
    {
        return Attachment::query()
            ->where('file_type', Attachment::FILE_TYPE_FALLBACK)
            ->where('external_url', 'like', 'https://%.zdn.vn/%.jpg');
    }
}
