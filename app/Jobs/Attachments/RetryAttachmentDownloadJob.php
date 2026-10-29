<?php

namespace App\Jobs\Attachments;

use App\Jobs\ApplicationJob;
use App\Models\Attachment;
use App\Services\Channels\RemoteAttachmentDownloader;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Tải lại đính kèm `fallback` sinh ra vì lượt tải đầu hỏng tạm thời (CDN trả 200
 * thân rỗng, mạng chập chờn). Chỉ đính kèm mang dấu `Attachment::META_DOWNLOAD_RETRY`
 * mới tới đây — dấu đó chỉ có khi URL mở được không cần bí mật của kênh.
 *
 * Tải được thì đính kèm thành tệp thật và tin phát `message.updated`, agent đang
 * mở hội thoại thấy ảnh hiện ra. Hết lượt thì giữ nguyên fallback (vẫn còn link gốc).
 * Downloader không ném lỗi nên lượt sau tự hẹn lại thay vì dựa vào `$tries`.
 */
class RetryAttachmentDownloadJob extends ApplicationJob
{
    /**
     * Độ trễ trước mỗi lượt tải lại, tính từ lượt hỏng ngay trước nó. CDN của kênh có lúc
     * trả 5xx cho ảnh vừa gửi hàng chục phút liền, nên các lượt cuối giãn tới vài giờ.
     */
    public const RETRY_DELAYS_SECONDS = [30, 120, 300, 1800, 7200, 21600];

    public function __construct(
        public readonly Attachment $attachment,
        public readonly int $attempt = 1,
    ) {
        $this->onQueue('low');
    }

    public static function schedule(Attachment $attachment, int $attempt = 1): void
    {
        if (! array_key_exists($attempt - 1, self::RETRY_DELAYS_SECONDS)) {
            return;
        }

        self::dispatch($attachment, $attempt)
            ->delay(now()->addSeconds(self::RETRY_DELAYS_SECONDS[$attempt - 1]))
            ->afterCommit();
    }

    public function handle(): void
    {
        $attachment = $this->attachment->fresh();

        if ($attachment === null || ! $attachment->awaitsDownloadRetry()) {
            return;
        }

        $downloaded = RemoteAttachmentDownloader::download(
            url: (string) $attachment->external_url,
            accountId: $attachment->account_id,
            filename: $attachment->fallback_title,
        );

        if ($downloaded === null) {
            $this->scheduleNextAttemptOrGiveUp($attachment);

            return;
        }

        $this->replaceFallbackWithFile($downloaded);
    }

    /** @param  array<string, mixed>  $downloaded */
    private function replaceFallbackWithFile(array $downloaded): void
    {
        $replacedAttachment = DB::transaction(function () use ($downloaded) {
            $attachment = Attachment::query()->lockForUpdate()->find($this->attachment->id);

            // Tin bị thu hồi hoặc lượt khác đã thay xong trong lúc đang tải.
            if ($attachment === null || ! $attachment->awaitsDownloadRetry()) {
                (new Attachment($downloaded))->discardStoredFile();

                return null;
            }

            $attachment->update([
                ...$downloaded,
                'file_type' => Attachment::fileTypeFromChannel($attachment->reportedFileTypeForRetry(), $downloaded['content_type']),
                'external_url' => null,
                'fallback_title' => null,
            ]);

            return $attachment;
        });

        // Đổi đính kèm không chạm cột nào của tin: touch() để hook `updated` của
        // tin phát `message.updated` với đính kèm mới.
        $replacedAttachment?->attachable?->touch();
    }

    private function scheduleNextAttemptOrGiveUp(Attachment $attachment): void
    {
        if (array_key_exists($this->attempt, self::RETRY_DELAYS_SECONDS)) {
            self::schedule($attachment, $this->attempt + 1);

            return;
        }

        Log::warning("[CHANNEL] Tải lại đính kèm #{$attachment->id} thất bại sau {$this->attempt} lượt, giữ đính kèm fallback.");

        $attachment->update(['meta' => Arr::except($attachment->meta ?? [], Attachment::META_DOWNLOAD_RETRY)]);
    }
}
