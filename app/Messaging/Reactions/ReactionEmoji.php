<?php

namespace App\Messaging\Reactions;

/**
 * Chuẩn hoá emoji cảm xúc về dạng hiển thị emoji. Messenger (và một số kênh) gửi
 * ký hiệu trần như ❤ (U+2764) không kèm dấu chọn kiểu U+FE0F nên trình duyệt vẽ
 * dạng chữ đen; thêm U+FE0F để mọi kênh ra cùng một trái tim đỏ.
 */
final class ReactionEmoji
{
    private const EMOJI_PRESENTATION_SELECTOR = "\u{FE0F}";

    /** Khoảng ký hiệu Unicode mặc định vẽ dạng chữ (mũi tên, ký hiệu linh tinh, dingbats…). */
    private const TEXT_DEFAULT_SYMBOL_RANGE = [0x2000, 0x2BFF];

    public static function normalize(?string $emoji): ?string
    {
        if ($emoji === null || $emoji === '') {
            return $emoji;
        }

        if (mb_strlen($emoji) !== 1) {
            return $emoji;
        }

        $codePoint = mb_ord($emoji);

        return $codePoint >= self::TEXT_DEFAULT_SYMBOL_RANGE[0] && $codePoint <= self::TEXT_DEFAULT_SYMBOL_RANGE[1]
            ? $emoji.self::EMOJI_PRESENTATION_SELECTOR
            : $emoji;
    }
}
