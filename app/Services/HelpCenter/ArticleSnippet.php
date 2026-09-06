<?php

namespace App\Services\HelpCenter;

// Port từ _search_article.json.jbuilder: nội dung markdown được rút về văn bản
// thuần rồi cắt quanh từ khoá (excerpt radius 110) hoặc cắt 220 ký tự đầu.
final class ArticleSnippet
{
    private const RADIUS = 110;

    private const FALLBACK_LENGTH = 220;

    private const OMISSION = '...';

    public static function build(string $markdown, string $query): string
    {
        $text = self::toPlainText($markdown);
        $position = $query === '' ? false : mb_stripos($text, $query);

        if ($position === false) {
            return self::truncate($text);
        }

        $start = max(0, $position - self::RADIUS);
        $end = min(mb_strlen($text), $position + mb_strlen($query) + self::RADIUS);

        return ($start > 0 ? self::OMISSION : '')
            .mb_substr($text, $start, $end - $start)
            .($end < mb_strlen($text) ? self::OMISSION : '');
    }

    public static function toPlainText(string $markdown): string
    {
        $text = preg_replace('/```.*?```/su', ' ', $markdown) ?? $markdown;
        $text = preg_replace('/!?\[([^\]]*)\]\([^)]*\)/u', '$1', $text) ?? $text;
        $text = preg_replace('/<[^>]+>/u', ' ', $text) ?? $text;
        $text = preg_replace('/[*_`>#~^|-]+/u', ' ', $text) ?? $text;

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }

    private static function truncate(string $text): string
    {
        if (mb_strlen($text) <= self::FALLBACK_LENGTH) {
            return $text;
        }

        $cut = mb_substr($text, 0, self::FALLBACK_LENGTH - mb_strlen(self::OMISSION));
        $lastSpace = mb_strrpos($cut, ' ');

        return ($lastSpace === false ? $cut : mb_substr($cut, 0, $lastSpace)).self::OMISSION;
    }
}
