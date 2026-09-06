<?php

namespace App\Services\Messages;

use App\Models\Message;

/**
 * Port của Messages::InReplyToMessageBuilder (refs/chatwoot/app/services/messages/
 * in_reply_to_message_builder.rb). Nối hai cách trỏ tin được trả lời về cùng một
 * cặp giá trị trên `content_attributes`:
 *   - `in_reply_to` = id nội bộ (FE composer đặt khi agent bấm "Reply to")
 *   - `in_reply_to_external_id` = source_id của nền tảng (driver kênh ngoài đặt)
 * Bên nào đặt trước thì bên kia được suy ra, nhờ vậy FE chỉ cần đọc `in_reply_to`.
 */
class InReplyToMessageBuilder
{
    public function __construct(
        private readonly Message $message,
        private readonly int|string|null $inReplyTo,
        private readonly int|string|null $inReplyToExternalId,
    ) {}

    public function perform(): void
    {
        if (blank($this->inReplyTo) && blank($this->inReplyToExternalId)) {
            return;
        }

        $target = $this->inReplyToMessage();

        $this->message->content_attributes = [
            ...$this->message->content_attributes ?? [],
            'in_reply_to_external_id' => $target?->source_id,
            'in_reply_to' => $target?->id,
        ];
    }

    private function inReplyToMessage(): ?Message
    {
        $conversation = $this->message->conversation;

        if ($conversation === null) {
            return null;
        }

        if (filled($this->inReplyTo)) {
            return $conversation->messages()->whereKey($this->inReplyTo)->first();
        }

        return $conversation->messages()->where('source_id', (string) $this->inReplyToExternalId)->first();
    }
}
