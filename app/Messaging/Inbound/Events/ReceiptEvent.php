<?php

namespace App\Messaging\Inbound\Events;

use App\Services\Messaging\MessageReceiptService;
use Carbon\CarbonInterface;

/**
 * Biên nhận đã giao / đã xem. Kênh báo theo danh sách id tin (Zalo, WhatsApp) hoặc
 * theo mốc thời gian cho một người (Messenger `watermark`).
 */
final class ReceiptEvent implements InboundEvent
{
    /** @param list<string> $sourceIds */
    private function __construct(
        public readonly string $receipt,
        public readonly array $sourceIds = [],
        public readonly ?string $contactSourceId = null,
        public readonly ?CarbonInterface $watermark = null,
    ) {}

    /** @param list<string> $sourceIds */
    public static function delivered(array $sourceIds): self
    {
        return new self(MessageReceiptService::DELIVERED, $sourceIds);
    }

    /** @param list<string> $sourceIds */
    public static function read(array $sourceIds): self
    {
        return new self(MessageReceiptService::READ, $sourceIds);
    }

    public static function deliveredUpTo(string $contactSourceId, CarbonInterface $watermark): self
    {
        return new self(MessageReceiptService::DELIVERED, contactSourceId: $contactSourceId, watermark: $watermark);
    }

    public static function readUpTo(string $contactSourceId, CarbonInterface $watermark): self
    {
        return new self(MessageReceiptService::READ, contactSourceId: $contactSourceId, watermark: $watermark);
    }
}
