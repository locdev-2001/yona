<?php

namespace App\Console\Commands;

use App\Models\Message;
use App\Search\SearchOutbox;
use App\Services\Zalo\ZaloChatTip;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Dòng thông báo hệ thống Zalo (tạo nhắc hẹn…) nhận trước khi driver nhận diện
 * được đã lưu thành tin khách gửi. Lệnh chuyển chúng về tin hoạt động theo đúng
 * luật của driver (ZaloChatTip), bỏ người gửi như mọi tin hoạt động; xem trước
 * của thẻ hội thoại tự rơi về tin thường trước đó. Chạy lại nhiều lần không đổi
 * gì thêm.
 */
class RepairZaloChatTips extends Command
{
    private const CHUNK_SIZE = 200;

    protected $signature = 'messages:repair-zalo-chat-tips
        {--dry-run : Chỉ in số đếm và id sẽ đổi, không ghi gì}';

    protected $description = 'Chuyển dòng thông báo hệ thống của Zalo đang lưu nhầm thành tin khách về tin hoạt động';

    public function handle(SearchOutbox $searchOutbox): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $repaired = 0;

        $this->candidates()->chunkById(self::CHUNK_SIZE, function ($messages) use ($dryRun, $searchOutbox, &$repaired) {
            foreach ($messages as $message) {
                if (! ZaloChatTip::matches($message->content_attributes['zca_message'] ?? null)) {
                    continue;
                }

                if (! $dryRun) {
                    $message->updateQuietly([
                        'message_type' => Message::TYPE_ACTIVITY,
                        'sender_type' => null,
                        'sender_id' => null,
                    ]);
                    // Ghi lặng không phát sự kiện model: tự báo chỉ mục tìm kiếm riêng (nếu có).
                    $searchOutbox->recordUpsert($message);
                }

                $repaired++;
                $this->line(sprintf('  #%d  account %d', $message->id, $message->account_id));
            }
        });

        $this->components->info($dryRun
            ? "Thử chạy: {$repaired} tin sẽ chuyển thành tin hoạt động."
            : "Đã chuyển {$repaired} tin thành tin hoạt động.");

        return self::SUCCESS;
    }

    /** Lọc thô ở SQL cho đỡ quét; quyết định cuối là ZaloChatTip. */
    private function candidates(): Builder
    {
        return Message::query()
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->whereRaw("(content_attributes)::jsonb #>> '{zca_message,content,action}' = ?", [ZaloChatTip::ACTION]);
    }
}
