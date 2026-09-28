<?php

namespace App\Services\Stickers;

use Illuminate\Support\Str;

// Nhãn và từ khoá của sticker: nguồn duy nhất của giới hạn và cách chuẩn hoá,
// dùng chung cho upload, sửa tay và Platform API.
final class StickerTags
{
    public const MAX_LABEL_LENGTH = 255;

    public const MAX_KEYWORDS = 20;

    public const MAX_KEYWORD_LENGTH = 40;

    /**
     * Luật kiểm nhãn + từ khoá dùng chung cho mọi form request.
     *
     * @return array<string, list<string>>
     */
    public static function validationRules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:'.self::MAX_LABEL_LENGTH],
            'keywords' => ['nullable', 'array', 'max:'.self::MAX_KEYWORDS],
            'keywords.*' => ['string', 'max:'.self::MAX_KEYWORD_LENGTH],
        ];
    }

    /**
     * Câu lỗi theo trường (label, keywords, keywords.N) để client đặt ngay dưới ô nhập.
     *
     * @return array<string, string>
     */
    public static function validationMessages(): array
    {
        return [
            'label.max' => __('errors.sticker_library.label_too_long'),
            'keywords.max' => __('errors.sticker_library.too_many_keywords'),
            'keywords.*.string' => __('errors.sticker_library.keyword_not_text'),
            'keywords.*.max' => __('errors.sticker_library.keyword_too_long'),
        ];
    }

    public static function label(?string $label): ?string
    {
        $trimmed = trim((string) $label);

        return $trimmed === '' ? null : Str::limit($trimmed, self::MAX_LABEL_LENGTH, '');
    }

    /**
     * Chữ thường, gọn khoảng trắng, bỏ rỗng và trùng, cắt theo trần.
     *
     * @param  array<mixed>  $keywords
     * @return list<string>
     */
    public static function keywords(array $keywords): array
    {
        $normalized = [];

        foreach ($keywords as $keyword) {
            if (! is_string($keyword)) {
                continue;
            }

            $word = mb_substr(mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $keyword))), 0, self::MAX_KEYWORD_LENGTH);
            $word = trim($word);

            if ($word !== '' && ! in_array($word, $normalized, true)) {
                $normalized[] = $word;
            }

            if (count($normalized) >= self::MAX_KEYWORDS) {
                break;
            }
        }

        return $normalized;
    }
}
