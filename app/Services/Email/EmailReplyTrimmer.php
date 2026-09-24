<?php

namespace App\Services\Email;

// Thay cho gem `email_reply_trimmer`: cắt phần thư trích dẫn lại
// ở cuối để giữ đúng nội dung người ta vừa gõ.
class EmailReplyTrimmer
{
    // Dòng mở đầu khối trích dẫn của các webmail phổ biến.
    private const QUOTE_HEADER_PATTERNS = [
        '/^\s*On .*wrote:\s*$/i',
        '/^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i',
        '/^\s*-{2,}\s*Forwarded message\s*-{2,}\s*$/i',
        '/^\s*From:\s.+$/i',
        '/^\s*Vào .*đã viết:\s*$/iu',
    ];

    public static function trim(?string $body): string
    {
        if (blank($body)) {
            return '';
        }

        $lines = preg_split('/\R/', (string) $body) ?: [];
        $kept = [];

        foreach ($lines as $line) {
            if (self::isQuoteHeader($line) || self::isSignatureSeparator($line)) {
                break;
            }

            if (str_starts_with(ltrim($line), '>')) {
                continue;
            }

            $kept[] = $line;
        }

        return rtrim(implode("\n", $kept));
    }

    private static function isQuoteHeader(string $line): bool
    {
        foreach (self::QUOTE_HEADER_PATTERNS as $pattern) {
            if (preg_match($pattern, $line) === 1) {
                return true;
            }
        }

        return false;
    }

    private static function isSignatureSeparator(string $line): bool
    {
        return rtrim($line) === '-- ';
    }
}
