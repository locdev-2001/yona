<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerTags;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;

#[Name('upload_sticker')]
#[Description('Tải một sticker động vào một bộ trong kho của token: gửi đúng MỘT trong hai, lottie_json (chuỗi JSON Lottie) hoặc tgs_base64 (tệp .tgs mã hoá base64). Tệp qua cùng cổng kiểm như tải tay; bị từ chối thì trả câu lỗi nói rõ giới hạn nào. Sticker mới ở trạng thái processing, dựng ảnh xong mới ready: gọi get_sticker_pack để xem. Đọc resource hướng dẫn viết Lottie trước khi tự viết, và xem thử bằng preview_sticker trước khi tải.')]
class UploadSticker extends StickerLibraryTool
{
    private const THROTTLE_KEY_PREFIX = 'mcp-sticker-uploads:';

    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'pack_id' => $this->packIdSchema($schema),
            ...StickerAnimationInput::properties($schema),
            ...StickerTagSchema::properties($schema),
        ];
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate([
            ...$this->packIdRules(),
            ...StickerAnimationInput::rules(),
            ...StickerTags::validationRules(),
        ]);
        $pack = $this->findPack($library, $request);

        if ($this->throttled(self::THROTTLE_KEY_PREFIX, StickerLibraryManager::UPLOADS_PER_MINUTE)) {
            return Response::error(__('errors.sticker_library.upload_throttled'));
        }

        ['contents' => $contents, 'extension' => $extension] = StickerAnimationInput::contents($validated);
        if ($contents === false) {
            return Response::error(__('errors.sticker_library.invalid_base64'));
        }

        $sticker = $library->uploadContents($pack, $contents, $extension, $validated['label'] ?? null, $validated['keywords'] ?? []);

        return $this->stickerResponse($sticker->refresh());
    }
}
