<?php

namespace App\Mailboxes\Concerns;

use App\Models\Message;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/mailboxes/mailbox_sanitizer.rb — Postgres không nhận
// byte NUL trong cột text, nên mọi chuỗi lấy từ thư phải qua đây trước khi lưu.
trait MailboxSanitizer
{
    private const NULL_BYTE = "\0";

    protected function sanitizedMessageAttributes(string $sourceId): array
    {
        return [
            'account_id' => $this->conversation->account_id,
            // rtrim: dòng trống trước boundary MIME thuộc về boundary, không
            // phải nội dung — gem Mail của bản gốc bỏ nó, zbateson thì giữ.
            'content' => Str::limit(rtrim((string) $this->sanitize($this->mailContent())), Message::MAX_CONTENT_LENGTH, ''),
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => Message::TYPE_INCOMING,
            'content_type' => Message::CONTENT_TYPES['incoming_email'],
            'source_id' => $sourceId,
            'content_attributes' => $this->sanitizedContentAttributes(),
        ];
    }

    protected function sanitizedContentAttributes(): array
    {
        return $this->sanitize([
            'email' => $this->processedMail->serializedData(),
            'cc_email' => $this->processedMail->cc(),
            'bcc_email' => $this->processedMail->bcc(),
        ]);
    }

    protected function sanitize(mixed $value): mixed
    {
        if (is_string($value)) {
            return str_replace(self::NULL_BYTE, '', $value);
        }

        if (is_array($value)) {
            return array_map(fn (mixed $item) => $this->sanitize($item), $value);
        }

        return $value;
    }
}
