<?php

namespace App\Services\Facebook;

use App\Models\Channel\FacebookPage;
use App\Services\Messaging\MessageReceiptService;
use Illuminate\Support\Carbon;

/**
 * Sự kiện `delivery` / `read` của Messenger. `delivery` có thể kèm `mids` (đúng tin
 * nào đã tới), còn `read` chỉ có `watermark`: mọi tin gửi trước mốc đó đã được xem.
 */
class ReceiptRecorder
{
    /** @param array<string, mixed> $messaging */
    public function __construct(private readonly array $messaging) {}

    /** @param array<string, mixed> $messaging */
    public static function handles(array $messaging): bool
    {
        return filled($messaging['delivery'] ?? null) || filled($messaging['read'] ?? null);
    }

    public function perform(): void
    {
        $contactSourceId = data_get($this->messaging, 'sender.id');

        if (blank($contactSourceId)) {
            return;
        }

        $receipts = app(MessageReceiptService::class);

        FacebookPage::query()->where('page_id', data_get($this->messaging, 'recipient.id'))->get()
            ->filter(fn (FacebookPage $page) => $page->inbox !== null)
            ->each(function (FacebookPage $page) use ($receipts, $contactSourceId) {
                $this->apply($receipts, $page, (string) $contactSourceId);
            });
    }

    private function apply(MessageReceiptService $receipts, FacebookPage $page, string $contactSourceId): void
    {
        $delivery = (array) ($this->messaging['delivery'] ?? []);

        if (filled($delivery['mids'] ?? null)) {
            $receipts->applyToSourceIds($page->inbox, (array) $delivery['mids'], MessageReceiptService::DELIVERED);
        } elseif (filled($delivery['watermark'] ?? null)) {
            $receipts->applyUpTo($page->inbox, $contactSourceId, $this->watermark($delivery['watermark']), MessageReceiptService::DELIVERED);
        }

        $readWatermark = data_get($this->messaging, 'read.watermark');

        if (filled($readWatermark)) {
            $receipts->applyUpTo($page->inbox, $contactSourceId, $this->watermark($readWatermark), MessageReceiptService::READ);
        }
    }

    private function watermark(int|string $milliseconds): Carbon
    {
        return Carbon::createFromTimestampMs((int) $milliseconds);
    }
}
