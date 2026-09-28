<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;

#[Name('upload_sticker')]
#[Description('Tải một sticker động vào một bộ trong kho của token: gửi đúng MỘT trong hai, lottie_json (chuỗi JSON Lottie) hoặc tgs_base64 (tệp .tgs mã hoá base64). Tệp qua cùng cổng kiểm như tải tay; bị từ chối thì trả câu lỗi nói rõ giới hạn nào. Sticker mới ở trạng thái processing, dựng ảnh xong mới ready: gọi get_sticker_pack để xem. Đọc resource hướng dẫn viết Lottie trước khi tự viết.')]
class UploadSticker extends StickerLibraryTool
{
    private const LOTTIE_EXTENSION = 'json';

    private const TGS_EXTENSION = 'tgs';

    private const THROTTLE_KEY_PREFIX = 'mcp-sticker-uploads:';

    private const THROTTLE_WINDOW_SECONDS = 60;

    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            'lottie_json' => $schema->string()->description('Toàn bộ tài liệu Lottie dạng chuỗi JSON. Bỏ trống nếu gửi tgs_base64.'),
            'tgs_base64' => $schema->string()->description('Tệp .tgs (Lottie nén gzip) mã hoá base64. Bỏ trống nếu gửi lottie_json.'),
            ...StickerTagSchema::properties($schema),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate([
            ...$this->packIdRules(),
            'lottie_json' => ['required_without:tgs_base64', 'prohibits:tgs_base64', 'string', 'max:'.LottieDocumentValidator::MAX_UPLOAD_BYTES],
            'tgs_base64' => ['required_without:lottie_json', 'string', 'max:'.self::maxBase64Length()],
            ...StickerTags::validationRules(),
        ]);
        $pack = $this->findPack($library, $request);

        $throttleKey = self::THROTTLE_KEY_PREFIX.$this->libraryTarget()->rateLimitKey();
        if (RateLimiter::tooManyAttempts($throttleKey, StickerLibraryManager::UPLOADS_PER_MINUTE)) {
            return Response::error(__('errors.sticker_library.upload_throttled'));
        }
        RateLimiter::hit($throttleKey, self::THROTTLE_WINDOW_SECONDS);

        [$contents, $extension] = isset($validated['lottie_json'])
            ? [$validated['lottie_json'], self::LOTTIE_EXTENSION]
            : [base64_decode($validated['tgs_base64'], true), self::TGS_EXTENSION];

        if ($contents === false) {
            return Response::error(__('errors.sticker_library.invalid_base64'));
        }

        $sticker = $library->uploadContents($pack, $contents, $extension, $validated['label'] ?? null, $validated['keywords'] ?? []);

        return $this->stickerResponse($sticker->refresh());
    }

    // Chặn độ dài chuỗi trước khi giải mã; service vẫn đếm lại theo byte sau khi giải mã.
    private static function maxBase64Length(): int
    {
        return intdiv(LottieDocumentValidator::MAX_UPLOAD_BYTES + 2, 3) * 4;
    }
}
