<?php

namespace App\Mcp\Tools\Stickers;

use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\StickerPreviewService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('preview_sticker')]
#[Description('Xem thử một sticker trước khi tải: gửi đúng MỘT trong hai, lottie_json hoặc tgs_base64, cùng luật như upload_sticker. Trả ảnh poster (webp) dựng bằng đúng trình dựng của kho để bạn tự nhìn và kiểm, kèm kích thước, số khung, thời lượng. Không lưu gì vào kho. Tệp bị cổng kiểm từ chối thì trả câu lỗi nói rõ giới hạn nào.')]
#[IsReadOnly]
class PreviewSticker extends StickerLibraryTool
{
    // Mỗi lượt xem thử chạy trình dựng ảnh ngay trong request nên nhịp chặt hơn tải lên.
    public const PREVIEWS_PER_MINUTE = 20;

    private const THROTTLE_KEY_PREFIX = 'mcp-sticker-previews:';

    private const SUMMARY = 'Qua cổng kiểm. Khung %d×%d px, %d khung hình, %s giây. Ảnh poster dưới đây dựng ở khung %s; kiểm theo checklist QA rồi mới upload_sticker.';

    /** @return array<string, mixed> */
    public function schema(JsonSchema $schema): array
    {
        return StickerAnimationInput::properties($schema);
    }

    protected function respond(Request $request, StickerLibraryManager $library): Response|ResponseFactory
    {
        $validated = $request->validate(StickerAnimationInput::rules());

        if ($this->throttled(self::THROTTLE_KEY_PREFIX, self::PREVIEWS_PER_MINUTE)) {
            return Response::error(__('errors.sticker_library.preview_throttled'));
        }

        ['contents' => $contents, 'extension' => $extension] = StickerAnimationInput::contents($validated);
        if ($contents === false) {
            return Response::error(__('errors.sticker_library.invalid_base64'));
        }

        $preview = app(StickerPreviewService::class)->preview($contents, $extension);
        if (isset($preview['failure'])) {
            return Response::error(__("errors.sticker_uploads.{$preview['failure']}"));
        }

        return Response::make([
            Response::text(sprintf(
                self::SUMMARY,
                $preview['width'],
                $preview['height'],
                $preview['frame_count'],
                round($preview['duration_ms'] / 1000, 2),
                $preview['poster_frame'],
            )),
            Response::image($preview['poster'], StickerPreviewService::POSTER_MIME_TYPE),
        ]);
    }
}
