<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerTags;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;

// Mô tả nhãn + từ khoá trong input schema, giới hạn lấy từ StickerTags.
final class StickerTagSchema
{
    /** @return array{label: Type, keywords: Type} */
    public static function properties(JsonSchema $schema): array
    {
        return [
            'label' => $schema->string()->max(StickerTags::MAX_LABEL_LENGTH)->nullable()
                ->description('Nhãn ngắn mô tả sticker (ví dụ "Mèo cảm ơn"). null để xoá nhãn.'),
            'keywords' => $schema->array()
                ->items($schema->string()->max(StickerTags::MAX_KEYWORD_LENGTH))
                ->max(StickerTags::MAX_KEYWORDS)
                ->description(sprintf(
                    'Tối đa %d từ khoá, mỗi từ tối đa %d ký tự; tự chuyển chữ thường, bỏ trùng. Gợi ý khi gõ và ô tìm đều so khớp không dấu, coi - _ . / là khoảng trắng, nên mỗi từ chỉ cần một dạng ("cam on" đủ cho cả "cảm ơn").',
                    StickerTags::MAX_KEYWORDS,
                    StickerTags::MAX_KEYWORD_LENGTH,
                )),
        ];
    }
}
