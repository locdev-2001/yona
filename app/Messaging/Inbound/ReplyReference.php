<?php

namespace App\Messaging\Inbound;

/**
 * Tin được trích dẫn: id ngoài của tin gốc (lõi tự đổi sang id nội bộ khi lưu —
 * InReplyToMessageBuilder) và ảnh chụp để bong bóng vẫn hiện khi tin gốc không có trong Yona.
 */
final class ReplyReference
{
    public function __construct(
        public readonly ?string $externalId,
        public readonly ?string $content = null,
        public readonly ?string $senderName = null,
        public readonly ?string $attachmentType = null,
    ) {}

    /** @return array<string, mixed> */
    public function attributes(): array
    {
        $preview = array_filter([
            'content' => $this->content,
            'sender_name' => $this->senderName,
            'attachment_type' => $this->attachmentType,
        ], fn ($value) => filled($value));

        return array_filter([
            'in_reply_to_external_id' => $this->externalId,
            'in_reply_to_preview' => $preview ?: null,
        ], fn ($value) => $value !== null);
    }
}
