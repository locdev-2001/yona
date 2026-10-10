<?php

namespace App\Messaging\Stickers;

use App\Models\Attachment;
use App\Models\Message;

/**
 * Hình dạng DUY NHẤT của tin sticker trong lõi, mọi kênh và kho Yona cùng đi qua đây:
 *
 *   - `content_type` = sticker, `content` rỗng (chữ hiển thị do MessagePreview dịch);
 *   - `content_attributes.sticker` = StickerContent::payload();
 *   - đúng MỘT đính kèm ảnh: ảnh kênh đã tải về, hoặc `external_url` khi ảnh nằm
 *     trên CDN công khai không hết hạn; không có ảnh thì không có đính kèm.
 *
 * Driver kênh không tự đặt ba trường trên. Luật này được ép bằng
 * tests/Contracts/Channels/Contracts/InboundStickerContract.php cho mọi kênh khai
 * `inbound_sticker`.
 */
final class StickerMessage
{
    public static function apply(Message $message, StickerContent $sticker, ?Attachment $image = null): void
    {
        $message->content_type = Message::CONTENT_TYPES['sticker'];
        $message->content = null;
        // Giữ thuộc tính kênh đã đặt (trích dẫn, echo…), bỏ khoá rỗng để payload sticker gọn.
        $message->content_attributes = array_filter(
            [...($message->content_attributes ?? []), 'sticker' => $sticker->payload()],
            fn ($value) => $value !== null,
        );
        $message->pendingAttachments = array_values(array_filter([$image ?? self::externalImage($message, $sticker)]));
    }

    public static function isSticker(Message $message): bool
    {
        return $message->content_type === Message::CONTENT_TYPES['sticker'];
    }

    private static function externalImage(Message $message, StickerContent $sticker): ?Attachment
    {
        if ($sticker->imageUrl === null) {
            return null;
        }

        return new Attachment([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'external_url' => $sticker->imageUrl,
        ]);
    }
}
