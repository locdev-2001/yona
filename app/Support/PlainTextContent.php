<?php

namespace App\Support;

// Thay cho `MessageFormatHelper#transform_user_mention_content` (CommonMarker
// render_doc(...).to_plaintext) và `String#truncate_words` của Rails: nội dung
// thông báo là markdown, người đọc chỉ cần phần chữ.
final class PlainTextContent
{
    private const LINK_PATTERN = '/\[([^\]]*)\]\([^)\s]*(?:\s+"[^"]*")?\)/u';

    private const EMPHASIS_PATTERN = '/(\*\*|__|\*|_|~~|`)(.+?)\1/u';

    public static function fromMarkdown(?string $content): string
    {
        if (blank($content)) {
            return '';
        }

        $text = preg_replace(self::LINK_PATTERN, '$1', (string) $content) ?? '';
        $text = preg_replace(self::EMPHASIS_PATTERN, '$2', $text) ?? '';

        return trim($text);
    }

    // truncate_words: cắt sau `$limit` từ, thêm hậu tố khi thực sự bị cắt.
    public static function truncateWords(?string $content, int $limit, string $omission = '...'): string
    {
        if (blank($content)) {
            return '';
        }

        $pattern = '/\A[[:space:]]*(?:\S+[[:space:]]*){1,'.$limit.'}/u';

        if (preg_match($pattern, (string) $content, $matches) !== 1) {
            return (string) $content;
        }

        $head = rtrim($matches[0]);

        return $head === rtrim((string) $content) ? $head : $head.$omission;
    }
}
