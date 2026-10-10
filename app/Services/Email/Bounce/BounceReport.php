<?php

namespace App\Services\Email\Bounce;

use App\Services\Email\MailPresenter;
use Illuminate\Support\Str;
use ZBateson\MailMimeParser\Message\IMessagePart;

/**
 * Đọc một thư báo gửi không thành (DSN, RFC 3464): thư gốc nào bị trả về, tới địa chỉ
 * nào, máy chủ nhận trả lời gì. Chỉ đọc, không đụng dữ liệu.
 */
final class BounceReport
{
    private const DIAGNOSTIC_MAX_LENGTH = 200;

    // Mã phản hồi SMTP kèm mã trạng thái mở rộng, vd "550 5.1.1" hay dòng nối "550-5.1.1".
    private const SMTP_REPLY_PATTERN = '/\b[45]\d\d[ -][245]\.\d{1,3}\.\d{1,3}\b/';

    private function __construct(private readonly MailPresenter $mail) {}

    public static function from(MailPresenter $mail): ?self
    {
        return $mail->isBounced() ? new self($mail) : null;
    }

    /** @return list<string> Message-ID của thư gốc, ưu tiên bản đính kèm trong DSN. */
    public function originalMessageIds(): array
    {
        $ids = [];

        foreach ($this->partsOfType(['message/rfc822', 'text/rfc822-headers', 'message/rfc822-headers']) as $part) {
            if (preg_match('/^Message-ID:\s*<?([^>\s]+)>?/mi', $this->headerBlock((string) $part->getContent()), $matches) === 1) {
                $ids[] = $matches[1];
            }
        }

        return array_values(array_unique(array_filter([
            ...$ids,
            $this->mail->inReplyTo(),
            ...array_reverse($this->mail->references()),
        ])));
    }

    public function failedRecipient(): ?string
    {
        $header = $this->mail->mail()->getHeaderValue('X-Failed-Recipients');

        if (filled($header)) {
            return trim(explode(',', (string) $header)[0]);
        }

        $field = $this->deliveryStatusField('Final-Recipient') ?? $this->deliveryStatusField('Original-Recipient');

        return $field === null ? null : (trim(Str::after($field, ';')) ?: null);
    }

    /** Lời máy chủ nhận thư trả về, rút gọn còn câu đầu. */
    public function diagnostic(): ?string
    {
        $diagnostic = $this->deliveryStatusField('Diagnostic-Code');
        $diagnostic = $diagnostic === null ? $this->diagnosticFromBody() : trim(Str::after($diagnostic, ';'));

        return blank($diagnostic) ? null : $this->shorten($diagnostic);
    }

    private function deliveryStatusField(string $name): ?string
    {
        foreach ($this->partsOfType(['message/delivery-status']) as $part) {
            $unfolded = preg_replace('/\r?\n[ \t]+/', ' ', (string) $part->getContent()) ?? '';

            if (preg_match('/^'.preg_quote($name, '/').':\s*(.+)$/mi', $unfolded, $matches) === 1) {
                return trim($matches[1]);
            }
        }

        return null;
    }

    private function diagnosticFromBody(): ?string
    {
        $text = (string) ($this->mail->textContent()['full'] ?? '');

        if (preg_match(self::SMTP_REPLY_PATTERN, $text, $matches, PREG_OFFSET_CAPTURE) !== 1) {
            return null;
        }

        $paragraph = preg_split('/\r?\n\s*\r?\n/', substr($text, $matches[0][1]), 2)[0] ?? '';

        return trim($paragraph);
    }

    private function shorten(string $diagnostic): string
    {
        $flat = trim((string) preg_replace('/\s+/', ' ', $diagnostic));
        $status = preg_match(self::SMTP_REPLY_PATTERN, $flat, $matches) === 1 ? $matches[0] : null;

        if ($status !== null) {
            // Máy chủ gập lời trả về thành nhiều dòng, mỗi dòng lặp lại mã trạng thái.
            $flat = trim((string) preg_replace(self::SMTP_REPLY_PATTERN, '', $flat));
        }

        $firstSentence = preg_split('/(?<=[.!?])\s/', $flat, 2)[0] ?? $flat;
        $sentence = $status === null ? $firstSentence : str_replace('-', ' ', $status).' '.$firstSentence;

        return Str::limit($sentence, self::DIAGNOSTIC_MAX_LENGTH);
    }

    private function headerBlock(string $content): string
    {
        return preg_split('/\r?\n\r?\n/', $content, 2)[0] ?? '';
    }

    /**
     * @param  list<string>  $types
     * @return list<IMessagePart>
     */
    private function partsOfType(array $types): array
    {
        return array_values(array_filter(
            $this->mail->mail()->getAllParts(),
            static fn (IMessagePart $part) => in_array(strtolower((string) $part->getContentType()), $types, true),
        ));
    }
}
