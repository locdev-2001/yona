<?php

namespace App\Console\Commands;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Dựng lại ảnh của mọi sticker đã `ready` từ đúng Lottie đang lưu, dùng sau khi
 * đổi cách dựng ảnh (ví dụ cỡ ảnh gửi sang kênh ngoài). Sticker vẫn hiện trong
 * lúc chờ vì job dựng lại không đổi trạng thái. Chạy lại được nhiều lần.
 */
class RerenderStickers extends Command
{
    protected $signature = 'stickers:rerender
        {--dry-run : Chỉ đếm, không xếp job nào}';

    protected $description = 'Dựng lại ảnh xem trước và ảnh gửi kênh ngoài của mọi sticker đã sẵn sàng';

    public function handle(): int
    {
        $disk = Storage::disk(Sticker::DISK);
        $queued = 0;
        $missing = 0;

        Sticker::query()->where('status', Sticker::STATUS_READY)->lazyById()->each(function (Sticker $sticker) use ($disk, &$queued, &$missing) {
            $animationJson = $sticker->animation_path ? $disk->get($sticker->animation_path) : null;

            if ($animationJson === null) {
                $missing++;

                return;
            }

            if (! $this->option('dry-run')) {
                RenderStickerJob::dispatch($sticker, $animationJson, refreshing: true);
            }
            $queued++;
        });

        $this->components->info(($this->option('dry-run') ? 'Sẽ dựng lại ' : 'Đã xếp dựng lại ')."{$queued} sticker.");
        if ($missing > 0) {
            $this->components->warn("{$missing} sticker thiếu tệp Lottie trên disk, bỏ qua.");
        }

        return self::SUCCESS;
    }
}
