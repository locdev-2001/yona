<?php

namespace App\Services\Email;

use Html2Text\Html2Text;

// Thay mọi <blockquote>
// (phần thư được trích dẫn lại) bằng dấu "&gt; " rồi đổi HTML sang text.
class HtmlParser
{
    public static function parseReply(?string $rawBody): string
    {
        if (blank($rawBody)) {
            return '';
        }

        return trim(Html2Text::convert(self::filterReplies((string) $rawBody), ['ignore_errors' => true]));
    }

    private static function filterReplies(string $rawBody): string
    {
        return (string) preg_replace('#<blockquote\b[^>]*>.*?</blockquote>#is', '&gt; ', $rawBody);
    }
}
