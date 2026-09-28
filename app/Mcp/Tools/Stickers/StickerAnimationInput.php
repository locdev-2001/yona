<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\LottieDocumentValidator;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;

// Tệp hoạt ảnh gửi qua MCP: đúng MỘT trong hai, lottie_json hoặc tgs_base64.
// upload_sticker và preview_sticker nhận cùng một kiểu, cùng luật.
final class StickerAnimationInput
{
    private const LOTTIE_EXTENSION = 'json';

    private const TGS_EXTENSION = 'tgs';

    /** @return array{lottie_json: Type, tgs_base64: Type} */
    public static function properties(JsonSchema $schema): array
    {
        return [
            'lottie_json' => $schema->string()->description('Toàn bộ tài liệu Lottie dạng chuỗi JSON. Bỏ trống nếu gửi tgs_base64.'),
            'tgs_base64' => $schema->string()->description('Tệp .tgs (Lottie nén gzip) mã hoá base64. Bỏ trống nếu gửi lottie_json.'),
        ];
    }

    /** @return array<string, list<string>> */
    public static function rules(): array
    {
        return [
            'lottie_json' => ['required_without:tgs_base64', 'prohibits:tgs_base64', 'string', 'max:'.LottieDocumentValidator::MAX_UPLOAD_BYTES],
            'tgs_base64' => ['required_without:lottie_json', 'string', 'max:'.self::maxBase64Length()],
        ];
    }

    /**
     * Nội dung tệp và đuôi tệp gốc; contents false khi base64 hỏng.
     *
     * @param  array<string, mixed>  $validated
     * @return array{contents: string|false, extension: string}
     */
    public static function contents(array $validated): array
    {
        return isset($validated['lottie_json'])
            ? ['contents' => (string) $validated['lottie_json'], 'extension' => self::LOTTIE_EXTENSION]
            : ['contents' => base64_decode((string) $validated['tgs_base64'], true), 'extension' => self::TGS_EXTENSION];
    }

    // Chặn độ dài chuỗi trước khi giải mã; service vẫn đếm lại theo byte sau khi giải mã.
    private static function maxBase64Length(): int
    {
        return intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES + 2, 3) * 4;
    }
}
