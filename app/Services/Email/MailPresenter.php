<?php

namespace App\Services\Email;

use App\Models\Account;
use App\Support\EmailAddress;
use ZBateson\MailMimeParser\Header\AddressHeader;
use ZBateson\MailMimeParser\IMessage;
use ZBateson\MailMimeParser\MailMimeParser;
use ZBateson\MailMimeParser\Message\IMessagePart;

/**
 * Bọc một thư RFC822 đã
 * parse và trả về đúng những mảnh mà mailbox cần (người gửi thật, nội dung
 * text/html tách phần trích dẫn, tệp đính kèm, header dùng để nối hội thoại).
 * Đây là ĐƯỜNG PARSE DUY NHẤT: IMAP lẫn fixture .eml đều đi qua `fromRaw`.
 */
class MailPresenter
{
    public function __construct(
        private readonly IMessage $mail,
        private readonly ?Account $account = null,
    ) {}

    public static function fromRaw(string $rawEmail, ?Account $account = null): self
    {
        return new self((new MailMimeParser)->parse($rawEmail, false), $account);
    }

    public function mail(): IMessage
    {
        return $this->mail;
    }

    public function messageId(): ?string
    {
        $messageId = $this->headerValue('Message-ID');

        return blank($messageId) ? null : trim((string) $messageId, '<>');
    }

    public function subject(): string
    {
        return (string) $this->headerValue('Subject');
    }

    public function date(): ?string
    {
        return $this->headerValue('Date');
    }

    public function contentType(): ?string
    {
        return $this->mail->getContentType();
    }

    public function isMultipart(): bool
    {
        return $this->mail->getChildCount() > 0;
    }

    /**
     * Khoá của text_content/html_content là hợp đồng đã lưu trong content_attributes
     * và lộ ra API/webhook, nên giữ nguyên tên dù dễ hiểu nhầm:
     * - full: thân thư nguyên bản (ảnh nhúng sẽ được thay vào đây);
     * - reply: thân thư đầy đủ đã giải mã, dùng khi trích lại thư lúc trả lời;
     * - quoted: phần khách vừa viết, ĐÃ BỎ khối trích dẫn — nội dung hiển thị của tin.
     *
     * @return array{full?: string, reply?: string, quoted?: string}
     */
    public function textContent(): array
    {
        $decoded = (string) $this->mail->getTextContent();

        if (blank($decoded)) {
            return [];
        }

        return [
            'full' => $decoded,
            'reply' => $decoded,
            'quoted' => EmailReplyTrimmer::trim($decoded),
        ];
    }

    /** @return array{full?: string, reply?: string, quoted?: string} */
    public function htmlContent(): array
    {
        $raw = (string) $this->mail->getHtmlContent();
        $reply = HtmlParser::parseReply($raw);

        if (blank($reply)) {
            return [];
        }

        return [
            'full' => $raw,
            'reply' => $reply,
            'quoted' => EmailReplyTrimmer::trim($reply),
        ];
    }

    /** @return list<IMessagePart> */
    public function attachmentParts(): array
    {
        return array_values($this->mail->getAllAttachmentParts());
    }

    public function numberOfAttachments(): int
    {
        return count($this->attachmentParts());
    }

    /** @return array<string, mixed> */
    public function serializedData(): array
    {
        return [
            'bcc' => $this->bcc(),
            'cc' => $this->cc(),
            'content_type' => $this->contentType(),
            'date' => $this->date(),
            'from' => $this->from(),
            'headers' => $this->headersData(),
            'html_content' => $this->htmlContent(),
            'in_reply_to' => $this->inReplyTo(),
            'message_id' => $this->messageId(),
            'multipart' => $this->isMultipart(),
            'number_of_attachments' => $this->numberOfAttachments(),
            'references' => $this->references(),
            'subject' => $this->subject(),
            'text_content' => $this->textContent(),
            'to' => $this->to(),
            'auto_reply' => $this->isAutoReply(),
        ];
    }

    public function inReplyTo(): ?string
    {
        $value = $this->headerValue('In-Reply-To');

        return blank($value) ? null : trim(explode(' ', trim((string) $value))[0], '<>');
    }

    /** @return list<string> */
    public function references(): array
    {
        $value = $this->headerValue('References');

        if (blank($value)) {
            return [];
        }

        return collect(preg_split('/\s+/', trim((string) $value)) ?: [])
            ->filter()
            ->map(fn (string $reference) => trim($reference, '<>'))
            ->values()
            ->all();
    }

    /** Reply-To nếu có, không thì From — chữ thường để khớp contact. */
    /** @return list<string> */
    public function from(): array
    {
        $addresses = $this->addresses('Reply-To') ?: $this->addresses('From');

        return array_map(strtolower(...), $addresses);
    }

    /** @return list<string> */
    public function to(): array
    {
        return $this->addresses('To');
    }

    /** @return list<string> */
    public function cc(): array
    {
        return $this->addresses('Cc');
    }

    /** @return list<string> */
    public function bcc(): array
    {
        return $this->addresses('Bcc');
    }

    public function senderName(): ?string
    {
        $header = $this->mail->getHeader('Reply-To') ?? $this->mail->getHeader('From');

        if (! $header instanceof AddressHeader) {
            return null;
        }

        $name = $header->getAddresses()[0]?->getName();

        return blank($name) ? null : $name;
    }

    // original_sender: Reply-To > X-Original-Sender > From.
    public function originalSender(): ?string
    {
        foreach (['Reply-To', 'X-Original-Sender', 'From'] as $header) {
            $address = $this->addresses($header)[0] ?? null;

            if (filled($address)) {
                return $address;
            }
        }

        return null;
    }

    /** @return array<string, string>|null */
    public function headersData(): ?array
    {
        $headers = collect([
            'x-original-from' => $this->headerValue('X-Original-From'),
            'x-original-sender' => $this->headerValue('X-Original-Sender'),
            'x-forwarded-for' => $this->headerValue('X-Forwarded-For'),
        ])->filter(fn (?string $value) => filled($value))->all();

        return $headers === [] ? null : $headers;
    }

    public function emailForwardedFor(): ?string
    {
        return $this->headerValue('X-Forwarded-For');
    }

    /** @return list<string> */
    public function mailReceiver(): array
    {
        $to = $this->to();

        if ($to !== []) {
            return $to;
        }

        return filled($this->emailForwardedFor()) ? [(string) $this->emailForwardedFor()] : [];
    }

    public function isAutoReply(): bool
    {
        $autoSubmitted = $this->headerValue('Auto-Submitted');
        $autoReply = $this->headerValue('X-Autoreply');

        return (filled($autoSubmitted) && $autoSubmitted !== 'no') || $autoReply === 'yes';
    }

    // Thư báo gửi không thành (DSN, RFC 3464): multipart/report; report-type=delivery-status.
    public function isBounced(): bool
    {
        return filled($this->headerValue('X-Failed-Recipients'))
            || strtolower((string) $this->mail->getHeaderParameter('Content-Type', 'report-type')) === 'delivery-status'
            || str_contains(strtolower((string) $this->contentType()), 'delivery-status');
    }

    // Thư thông báo do chính hệ thống gửi đi thì không được biến thành hội thoại.
    public function isNotificationEmailFromSelf(): bool
    {
        $configuredSender = EmailAddress::defaultSenderAddress();

        return filled($configuredSender)
            && strcasecmp((string) $this->originalSender(), $configuredSender) === 0;
    }

    public function account(): ?Account
    {
        return $this->account;
    }

    private function headerValue(string $name): ?string
    {
        $value = $this->mail->getHeaderValue($name);

        return blank($value) ? null : $value;
    }

    /** @return list<string> */
    private function addresses(string $name): array
    {
        $header = $this->mail->getHeader($name);

        if (! $header instanceof AddressHeader) {
            $value = $this->headerValue($name);
            $parsed = EmailAddress::parse($value);

            return $parsed === null ? [] : [$parsed];
        }

        return collect($header->getAddresses())
            ->map(fn ($address) => $address->getEmail())
            ->filter(fn (?string $email) => filled($email))
            ->values()
            ->all();
    }
}
