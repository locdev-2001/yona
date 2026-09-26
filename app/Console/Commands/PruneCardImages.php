<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Xoá ảnh thẻ (CardImageService, `card-images/*.png` trên disk `public`) cũ hơn N ngày.
 * Kênh nhận ảnh đã tải về lúc gửi nên ảnh cũ chỉ còn tốn đĩa; thẻ gửi lại sau này thì
 * CardImageService vẽ lại theo cùng mã băm.
 *
 * Chạy lại được nhiều lần: lượt sau chỉ xoá những gì vừa quá hạn.
 */
class PruneCardImages extends Command
{
    private const DIRECTORY = 'card-images';

    protected $signature = 'messaging:prune-card-images
        {--days=30 : Xoá ảnh không đổi quá số ngày này}
        {--dry-run : Chỉ đếm, không xoá gì}';

    protected $description = 'Xoá ảnh thẻ đã gửi qua kênh cũ hơn N ngày';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $cutoff = now()->subDays(max(1, (int) $this->option('days')))->getTimestamp();

        $stale = collect($disk->files(self::DIRECTORY))
            ->filter(fn (string $path) => str_ends_with($path, '.png') && $disk->lastModified($path) < $cutoff)
            ->values();

        if (! $this->option('dry-run')) {
            $disk->delete($stale->all());
        }

        $this->components->info(($this->option('dry-run') ? 'Sẽ xoá ' : 'Đã xoá ').$stale->count().' ảnh thẻ.');

        return self::SUCCESS;
    }
}
