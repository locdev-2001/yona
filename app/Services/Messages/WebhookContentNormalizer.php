<?php

namespace App\Services\Messages;

// bỏ hard line break kiểu CommonMark (dấu \ trước xuống dòng) và xuống dòng thừa
// ở cuối, để bên nhận webhook đọc được văn bản thuần.
class WebhookContentNormalizer
{
    public static function normalize(?string $text): ?string
    {
        if (blank($text)) {
            return $text;
        }

        return preg_replace('/(\r?\n)+$/', '', preg_replace('/\\\\\r?\n/', "\n", $text));
    }
}
