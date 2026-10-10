<?php

namespace App\Messaging\Inbound;

use App\Messaging\Stickers\StickerContent;
use Carbon\CarbonInterface;

/**
 * Một tin kênh báo về, đã bóc hết đặc thù của nền tảng. Driver chỉ dựng giá trị này;
 * InboundMessageWriter mới quyết định Message/Attachment trông thế nào.
 *
 * `attributes` là khoá `content_attributes` riêng của kênh mà lõi và giao diện đã có
 * hợp đồng (thẻ Zalo, `zca_message`, `referral`, ngữ cảnh nhóm…); các khoá chuẩn
 * (trích dẫn, chuyển tiếp, echo, sticker) KHÔNG đi qua đây mà qua trường riêng.
 */
final class InboundMessage
{
    /**
     * @param  list<InboundAttachment>  $attachments
     * @param  array<string, mixed>  $attributes
     * @param  array<string, mixed>  $conversationAttributes  gợi ý cho hội thoại mới (thread…)
     */
    public function __construct(
        public readonly ?string $sourceId,
        public readonly InboundDirection $direction = InboundDirection::Incoming,
        public readonly ?string $text = null,
        public readonly ?CarbonInterface $sentAt = null,
        public readonly ?StickerContent $sticker = null,
        public readonly array $attachments = [],
        public readonly ?ReplyReference $replyTo = null,
        public readonly ?ForwardOrigin $forwardedFrom = null,
        public readonly array $attributes = [],
        public readonly array $conversationAttributes = [],
    ) {}

    public function isEcho(): bool
    {
        return $this->direction === InboundDirection::Echo;
    }
}
