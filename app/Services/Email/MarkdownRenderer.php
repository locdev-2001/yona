<?php

namespace App\Services\Email;

use Illuminate\Support\Str;

// Thay cho ChatwootMarkdownRenderer#render_message: nội dung tin nhắn là markdown,
// thân thư HTML cần bản render. `hardbreaks` giữ xuống dòng đơn thành <br>.
class MarkdownRenderer
{
    public static function render(?string $content, bool $hardbreaks = false): string
    {
        if (blank($content)) {
            return '';
        }

        return trim(Str::markdown((string) $content, [
            'html_input' => 'escape',
            'allow_unsafe_links' => false,
            'renderer' => ['soft_break' => $hardbreaks ? "<br />\n" : "\n"],
        ]));
    }
}
