<?php

namespace App\Console\Commands;

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Dựng lại tệp của mọi sticker đã `ready` từ ảnh gốc + thông số chỉnh đã lưu,
 * dùng sau khi đổi cách dựng (ví dụ cạnh sticker STICKER_IMAGE_SIZE). Sticker vẫn
 * hiện trong lúc chờ vì job dựng lại không đổi trạng thái. Sticker không có ảnh
 * gốc (chuyển từ Lottie) giữ nguyên ảnh đang có. Chạy lại được nhiều lần.
 */
class RerenderStickers extends Command
{
    protected $signature = 'stickers:rerender
        {--dry-run : Chỉ đếm, không xếp job nào}';

    protected $description = 'Dựng lại tệp sticker đã sẵn sàng từ ảnh gốc của nó';

    public function handle(): int
    {
        $disk = Storage::disk(Sticker::DISK);
        $dryRun = (bool) $this->option('dry-run');
        $queued = 0;
        $withoutOriginal = 0;
        $missingOriginal = 0;

        Sticker::query()->where('status', Sticker::STATUS_READY)->lazyById()->each(function (Sticker $sticker) use ($disk, $dryRun, &$queued, &$withoutOriginal, &$missingOriginal) {
            if ($sticker->original_path === null) {
                $withoutOriginal++;

                return;
            }

            if (! $disk->exists($sticker->original_path)) {
                $missingOriginal++;

                return;
            }

            if (! $dryRun) {
                RenderStickerJob::dispatch($sticker, refreshing: true);
            }
            $queued++;
        });

        $this->components->info(($dryRun ? 'Sẽ dựng lại ' : 'Đã xếp dựng lại ')."{$queued} sticker.");
        if ($withoutOriginal > 0) {
            $this->components->info("{$withoutOriginal} sticker không có ảnh gốc (chuyển từ Lottie), giữ nguyên ảnh đang có.");
        }
        if ($missingOriginal > 0) {
            $this->components->warn("{$missingOriginal} sticker thiếu ảnh gốc trên disk, bỏ qua.");
        }

        return self::SUCCESS;
    }
}
