<?php

namespace App\Messaging;

use App\Channels\TextFormat;
use App\Messaging\Delivery\PendingDocument;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Attachment;
use App\Models\Message;
use App\Support\Messages\OutgoingText;

/**
 * Một dòng xem trước cho tin: danh sách hội thoại của widget, thông báo, email.
 * Sticker luôn ghi "Sticker" dù mang ảnh đính kèm hay chữ đi kèm; tin có cấu trúc
 * hỏi chính loại tin đó (StructuredType::previewText); tin chỉ có tệp thì ghi loại tệp.
 */
final class MessagePreview
{
    public const MAX_LENGTH = 140;

    public function __construct(private readonly StructuredTypeRegistry $registry) {}

    public function for(Message $message): string
    {
        if ($message->isDeleted()) {
            return __('messaging.preview.deleted');
        }

        if ($this->isSticker($message)) {
            return __('messaging.preview.sticker');
        }

        $type = $this->registry->for($message->contentTypeName());
        $attributes = $type === null ? null : $this->registry->read($message);
        $text = $attributes === null
            ? trim((string) OutgoingText::render($message->content, TextFormat::Plain))
            : $type->previewText($message->content, $attributes);

        if ($text === '' && $message->attachments->isNotEmpty()) {
            $text = __('messaging.preview.'.($message->attachments->first()->file_type === Attachment::FILE_TYPE_IMAGE ? 'image' : 'file'));
        } elseif ($text === '' && PendingDocument::isPending($message)) {
            $text = __('messaging.preview.file');
        }

        return mb_strimwidth(preg_replace('/\s+/u', ' ', $text) ?? '', 0, self::MAX_LENGTH, '…');
    }

    /** Content không tự nói lên tin (tin có cấu trúc, sticker): nơi hiển thị phải dùng dòng xem trước. */
    public function replacesContent(Message $message): bool
    {
        return $this->isSticker($message) || $this->registry->for($message->contentTypeName()) !== null;
    }

    private function isSticker(Message $message): bool
    {
        return $message->content_type === Message::CONTENT_TYPES['sticker'];
    }
}
