<?php

namespace App\Services\Email\Bounce;

use App\Services\Email\MailPresenter;
use Illuminate\Support\Str;

/**
 * Đọc một thư báo gửi không thành (DSN, RFC 3464): thư gốc nào bị trả về, tới những địa chỉ
 * nào, máy chủ nhận trả lời gì. Chỉ nhận DSN có ít nhất một người nhận "failed"; thư báo
 * trì hoãn (delayed) hay đã chuyển (delivered/relayed/expanded) không phải thư trả về.
 * Chỉ đọc, không đụng dữ liệu.
 */
final class BounceReport
{
    private const DIAGNOSTIC_MAX_LENGTH = 200;

    private const ORIGINAL_MESSAGE_TYPES = ['message/rfc822', 'text/rfc822-headers', 'message/rfc822-headers'];

    private const FAILED_ACTION = 'failed';

    // Mã phản hồi SMTP kèm mã trạng thái mở rộng, vd "550 5.1.1" hay dòng nối "550-5.1.1".
    private const SMTP_REPLY_PATTERN = '/\b[45]\d\d[ -][245]\.\d{1,3}\.\d{1,3}\b/';

    /** @param  list<array{recipient: string, diagnostic: ?string}>  $failures */
    private function __construct(
        private readonly MailPresenter $mail,
        private readonly array $failures,
    ) {}

    public static function from(MailPresenter $mail): ?self
    {
        if (! $mail->isDeliveryStatusNotification()) {
            return null;
        }

        $failures = self::failedRecipientsOf($mail);

        return $failures === [] ? null : new self($mail, $failures);
    }

    /**
     * Message-ID của thư gốc, chỉ lấy từ bản thư gốc đính kèm trong DSN. In-Reply-To và
     * References của chính thư báo ai cũng đặt được nên không dùng để tìm tin.
     *
     * @return list<string>
     */
    public function originalMessageIds(): array
    {
        $ids = [];

        foreach ($this->mail->partsOfType(self::ORIGINAL_MESSAGE_TYPES) as $part) {
            if (preg_match('/^Message-ID:\s*<?([^>\s]+)>?/mi', self::headerBlock((string) $part->getContent()), $matches) === 1) {
                $ids[] = $matches[1];
            }
        }

        return array_values(array_unique($ids));
    }

    /** @return list<string> Các địa chỉ máy chủ nhận đã từ chối hẳn. */
    public function failedRecipients(): array
    {
        return array_column($this->failures, 'recipient');
    }

    /** Lời máy chủ nhận trả về cho địa chỉ đó, rút gọn còn câu đầu. */
    public function diagnosticFor(string $recipient): ?string
    {
        foreach ($this->failures as $failure) {
            if (strcasecmp($failure['recipient'], $recipient) === 0) {
                $diagnostic = $failure['diagnostic'] ?? $this->diagnosticFromBody();

                return blank($diagnostic) ? null : self::shorten($diagnostic);
            }
        }

        return null;
    }

    /** @return list<array{recipient: string, diagnostic: ?string}> */
    private static function failedRecipientsOf(MailPresenter $mail): array
    {
        $failures = [];

        foreach ($mail->partsOfType(['message/delivery-status']) as $part) {
            $unfolded = preg_replace('/\r?\n[ \t]+/', ' ', (string) $part->getContent()) ?? '';
            // Khối đầu là thông tin chung của thư, mỗi khối sau là một người nhận.
            $recipientBlocks = array_slice(preg_split('/\r?\n\s*\r?\n/', trim($unfolded)) ?: [], 1);

            foreach ($recipientBlocks as $block) {
                $recipient = self::address(self::field($block, 'Final-Recipient') ?? self::field($block, 'Original-Recipient'));

                if ($recipient === null || ! self::isFailure($block)) {
                    continue;
                }

                $diagnostic = self::field($block, 'Diagnostic-Code');

                $failures[] = [
                    'recipient' => $recipient,
                    'diagnostic' => $diagnostic === null ? null : (trim(Str::after($diagnostic, ';')) ?: null),
                ];
            }
        }

        return $failures;
    }

    private static function isFailure(string $recipientBlock): bool
    {
        $action = strtolower((string) self::field($recipientBlock, 'Action'));

        if ($action !== '') {
            return $action === self::FAILED_ACTION;
        }

        return preg_match('/^5\.\d{1,3}\.\d{1,3}/', (string) self::field($recipientBlock, 'Status')) === 1;
    }

    private static function field(string $block, string $name): ?string
    {
        return preg_match('/^'.preg_quote($name, '/').':\s*(.+)$/mi', $block, $matches) === 1 ? trim($matches[1]) : null;
    }

    private static function address(?string $field): ?string
    {
        $address = $field === null ? '' : trim(Str::after($field, ';'), " \t<>");

        return $address === '' ? null : $address;
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

    private static function shorten(string $diagnostic): string
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

    private static function headerBlock(string $content): string
    {
        return preg_split('/\r?\n\r?\n/', $content, 2)[0] ?? '';
    }
}
