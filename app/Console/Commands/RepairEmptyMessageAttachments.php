<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

/**
 * Đổi đính kèm tin nhắn đã lưu thành tệp 0 byte (CDN trả 200 thân rỗng) sang
 * đính kèm `fallback`: bong bóng hiện tên tệp thay vì ảnh vỡ, tệp rỗng trên đĩa
 * bị xoá. Tên tệp gốc giữ lại làm `fallback_title`; URL gốc không còn nên không
 * khôi phục được liên kết. Bản ghi đã đổi không còn khớp điều kiện, nên chạy
 * lại nhiều lần không đổi gì thêm.
 */
class RepairEmptyMessageAttachments extends Command
{
    private const FILE_BEARING_TYPES = [
        Attachment::FILE_TYPE_IMAGE,
        Attachment::FILE_TYPE_AUDIO,
        Attachment::FILE_TYPE_VIDEO,
        Attachment::FILE_TYPE_FILE,
    ];

    private const CHUNK_SIZE = 500;

    protected $signature = 'attachments:repair-empty
        {--dry-run : Chỉ in số đếm và id sẽ đổi, không ghi gì}';

    protected $description = 'Chuyển đính kèm tin nhắn 0 byte sang đính kèm fallback và xoá tệp rỗng';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $repairedCount = 0;
        $skippedIds = [];

        $this->emptyAttachments()->chunkById(self::CHUNK_SIZE, function ($attachments) use ($dryRun, &$repairedCount, &$skippedIds) {
            foreach ($attachments as $attachment) {
                if ($this->storedFileHasContent($attachment)) {
                    $skippedIds[] = $attachment->id;

                    continue;
                }

                $this->line(sprintf('  #%d  account %d  %s', $attachment->id, $attachment->account_id, $attachment->filename ?? '-'));
                $repairedCount++;

                if (! $dryRun) {
                    $this->convertToFallback($attachment);
                }
            }
        });

        if ($skippedIds !== []) {
            $this->components->warn('Bỏ qua vì tệp trên đĩa có nội dung: #'.implode(', #', $skippedIds));
        }

        $this->components->info($dryRun
            ? "Thử chạy: {$repairedCount} đính kèm rỗng sẽ chuyển sang fallback."
            : "Đã chuyển {$repairedCount} đính kèm rỗng sang fallback.");

        return self::SUCCESS;
    }

    /** @return Builder<Attachment> */
    private function emptyAttachments(): Builder
    {
        return Attachment::query()
            ->where('attachable_type', (new Message)->getMorphClass())
            ->whereIn('file_type', self::FILE_BEARING_TYPES)
            ->whereNotNull('path')
            ->where('byte_size', 0);
    }

    // byte_size trong DB có thể lệch tệp thật; tệp có nội dung thì không đụng.
    private function storedFileHasContent(Attachment $attachment): bool
    {
        $disk = Storage::disk($attachment->disk);

        return $disk->exists($attachment->path) && $disk->size($attachment->path) > 0;
    }

    private function convertToFallback(Attachment $attachment): void
    {
        $attachment->discardStoredFile();

        $attachment->update([
            'file_type' => Attachment::FILE_TYPE_FALLBACK,
            'fallback_title' => $attachment->fallback_title ?: $attachment->filename,
            'path' => null,
            'content_type' => null,
            'byte_size' => null,
            'meta' => [],
        ]);
    }
}
