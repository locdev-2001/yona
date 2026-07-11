<?php

namespace App\Modules\Integration\Contracts;

/**
 * P11 — UI feature flags per-kênh (ADDITIVE-ONLY, không seal): FE ẩn/hiện nút
 * theo flags — cấm mọi rẽ nhánh theo tên kênh trong core/UI (grep gate enforce).
 * Flags là DỮ LIỆU, không phải code rẽ nhánh.
 *
 * PHÂN BIỆT với OutboundPolicy (MED-4): capability = "kênh làm được gì" (UI);
 * policy = "kênh cho phép gửi thế nào" (behavior driver-owned trong sendMessage —
 * Zalo: 7h-22h + cap3 + reply-exempt; OA sau này: 48h session; Messenger: 24h).
 * KHÔNG ép policy vào flags.
 */
final readonly class ChannelCapabilities
{
    public function __construct(
        public bool $canSendMedia = false,
        public bool $canSendSticker = false,
        public bool $canQuoteReply = false,
        public bool $canReact = false,
        public bool $canRecallOwn = false,
        public bool $hasDeliveryReceipts = false,
        public bool $hasSeenReceipts = false,
        public bool $hasTyping = false,
        public bool $canSendSeen = false,
        /** none | thread | per_member */
        public string $receiptGranularity = 'none',
    ) {}

    /** @return array<string, bool|string> */
    public function toArray(): array
    {
        return [
            'canSendMedia' => $this->canSendMedia,
            'canSendSticker' => $this->canSendSticker,
            'canQuoteReply' => $this->canQuoteReply,
            'canReact' => $this->canReact,
            'canRecallOwn' => $this->canRecallOwn,
            'hasDeliveryReceipts' => $this->hasDeliveryReceipts,
            'hasSeenReceipts' => $this->hasSeenReceipts,
            'hasTyping' => $this->hasTyping,
            'canSendSeen' => $this->canSendSeen,
            'receiptGranularity' => $this->receiptGranularity,
        ];
    }
}
