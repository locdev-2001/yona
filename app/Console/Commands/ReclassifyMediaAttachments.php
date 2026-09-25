<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Tính lại loại cho tệp đính kèm tin nhắn đang lưu là "tệp" dù nội dung xem
 * trước được (video, ảnh, âm thanh). Luật lấy đúng `Attachment::fileTypeFor`
 * nên lệnh không giữ danh sách MIME riêng; chạy lại nhiều lần không đổi gì thêm.
 */
class ReclassifyMediaAttachments extends Command
{
    /** Lọc thô ở SQL cho đỡ quét; quyết định cuối vẫn là `fileTypeFor`. */
    private const MEDIA_CONTENT_TYPE_PREFIXES = ['image', 'video', 'audio'];

    private const CHUNK_SIZE = 500;

    protected $signature = 'attachments:reclassify-media
        {--dry-run : Chỉ in số đếm và id sẽ đổi, không ghi gì}';

    protected $description = 'Tính lại loại cho tệp đính kèm media đang lưu nhầm là tệp';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $changedCounts = [];

        $this->misclassifiedCandidates()->chunkById(self::CHUNK_SIZE, function ($attachments) use ($dryRun, &$changedCounts) {
            foreach ($attachments as $attachment) {
                $fileType = Attachment::fileTypeFor($attachment->content_type);

                if ($fileType === Attachment::FILE_TYPE_FILE) {
                    continue;
                }

                if (! $dryRun) {
                    $attachment->update(['file_type' => $fileType]);
                }

                $typeName = array_search($fileType, Attachment::FILE_TYPES, true);
                $changedCounts[$typeName] = ($changedCounts[$typeName] ?? 0) + 1;
                $this->line(sprintf('  #%d  account %d  %s → %s', $attachment->id, $attachment->account_id, $attachment->content_type, $typeName));
            }
        });

        $total = array_sum($changedCounts);
        $breakdown = collect($changedCounts)->map(fn (int $count, string $type) => "{$type}: {$count}")->implode(', ');

        $this->components->info(
            ($dryRun ? "Thử chạy: {$total} tệp đính kèm sẽ đổi loại" : "Đã đổi loại {$total} tệp đính kèm")
            .($total > 0 ? " ({$breakdown})." : '.')
        );

        return self::SUCCESS;
    }

    /** @return Builder<Attachment> */
    private function misclassifiedCandidates(): Builder
    {
        return Attachment::query()
            ->where('attachable_type', (new Message)->getMorphClass())
            ->where('file_type', Attachment::FILE_TYPE_FILE)
            ->whereNotNull('path')
            ->where(function (Builder $query) {
                foreach (self::MEDIA_CONTENT_TYPE_PREFIXES as $prefix) {
                    $query->orWhere('content_type', 'like', "{$prefix}%");
                }
            });
    }
}
