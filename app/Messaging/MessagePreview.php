<?php

namespace App\Messaging;

use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Attachment;
use App\Models\Message;

/**
 * Một dòng xem trước cho tin: danh sách hội thoại của widget, thông báo, email.
 * Tin có cấu trúc hỏi chính loại tin đó (StructuredType::previewText), tin chỉ có
 * tệp thì ghi loại tệp.
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

        $type = $this->registry->for($message->contentTypeName());
        $attributes = $type === null ? null : $this->registry->read($message);
        $text = $attributes === null
            ? trim((string) $message->content)
            : $type->previewText($message->content, $attributes);

        if ($text === '' && $message->attachments->isNotEmpty()) {
            $text = __('messaging.preview.'.($message->attachments->first()->file_type === Attachment::FILE_TYPE_IMAGE ? 'image' : 'file'));
        }

        return mb_strimwidth(preg_replace('/\s+/u', ' ', $text) ?? '', 0, self::MAX_LENGTH, '…');
    }
}
