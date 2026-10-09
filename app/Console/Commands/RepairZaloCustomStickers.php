<?php

namespace App\Console\Commands;

use App\Models\Message;
use App\Services\Zalo\ZaloCustomSticker;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Tin sticker tự tạo nhận từ Zalo trước khi driver nhận diện được đã lưu thành
 * ảnh (`content_type` text + đính kèm ảnh). Lệnh chuyển chúng về contract sticker
 * theo đúng luật nhận diện của driver (ZaloCustomSticker); đính kèm ảnh đã tải về
 * giữ nguyên làm ảnh hiển thị. Chạy lại nhiều lần không đổi gì thêm.
 */
class RepairZaloCustomStickers extends Command
{
    private const CHUNK_SIZE = 200;

    protected $signature = 'messages:repair-zalo-custom-stickers
        {--dry-run : Chỉ in số đếm và id sẽ đổi, không ghi gì}';

    protected $description = 'Chuyển tin sticker tự tạo của Zalo đang lưu nhầm thành ảnh về tin sticker';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $repaired = 0;

        $this->candidates()->chunkById(self::CHUNK_SIZE, function ($messages) use ($dryRun, &$repaired) {
            foreach ($messages as $message) {
                $sticker = ZaloCustomSticker::fromZcaMessage($message->content_attributes['zca_message'] ?? null);

                if ($sticker === null) {
                    continue;
                }

                if (! $dryRun) {
                    $message->updateQuietly([
                        'content' => null,
                        'content_type' => Message::CONTENT_TYPES['sticker'],
                        'content_attributes' => [...$message->content_attributes, 'sticker' => $sticker->payload()],
                    ]);
                }

                $repaired++;
                $this->line(sprintf('  #%d  account %d', $message->id, $message->account_id));
            }
        });

        $this->components->info($dryRun
            ? "Thử chạy: {$repaired} tin sẽ chuyển thành sticker."
            : "Đã chuyển {$repaired} tin thành sticker.");

        return self::SUCCESS;
    }

    /** Lọc thô ở SQL cho đỡ quét; quyết định cuối là ZaloCustomSticker. */
    private function candidates(): Builder
    {
        return Message::query()
            ->where('content_type', '!=', Message::CONTENT_TYPES['sticker'])
            ->whereRaw("(content_attributes)::jsonb #>> '{zca_message,msgType}' = 'chat.photo'")
            ->whereRaw("(content_attributes)::jsonb #>> '{zca_message,content,params}' LIKE '%pStickerType%'");
    }
}
