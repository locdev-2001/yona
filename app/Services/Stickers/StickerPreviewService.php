<?php

namespace App\Services\Stickers;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

// Xem thử một sticker trước khi tải: qua đúng cổng kiểm và trình dựng ảnh của
// luồng upload, nhưng chỉ làm trong thư mục tạm, không ghi DB hay disk `stickers`.
final class StickerPreviewService
{
    public const POSTER_MIME_TYPE = 'image/webp';

    private const WORKSPACE_PREFIX = 'yona-sticker-preview-';

    private const ANIMATION_FILE = 'anim.json';

    private const RENDER_OUTPUT_DIRECTORY = 'rendered';

    public function __construct(
        private readonly StickerUploadService $uploads,
        private readonly StickerRendererResolver $renderers,
    ) {}

    /**
     * @return array{poster: string, poster_frame: int|float, width: int, height: int, frame_count: int, duration_ms: int}|array{failure: string}
     *
     * @throws ValidationException khi nội dung bị từ chối, câu báo lỗi ở errors.sticker_uploads.*
     */
    public function preview(string $contents, string $extension): array
    {
        ['json' => $animationJson, 'document' => $document] = $this->uploads->prepareContents($contents, $extension);
        $workspace = sys_get_temp_dir().'/'.self::WORKSPACE_PREFIX.Str::uuid();

        try {
            $rendered = $this->render($workspace, $animationJson);

            return isset($rendered['failure'])
                ? $rendered
                : [
                    'poster' => File::get($rendered['poster_path']),
                    'poster_frame' => $rendered['poster_frame'],
                    ...StickerUploadService::animationMetrics($document),
                ];
        } catch (Throwable $exception) {
            report($exception);

            return ['failure' => StickerRenderer::RENDERER_UNAVAILABLE];
        } finally {
            File::deleteDirectory($workspace);
        }
    }

    /**
     * @return array{poster_path: string, static_path: string, poster_frame: int|float}|array{failure: string}
     */
    private function render(string $workspace, string $animationJson): array
    {
        $animationPath = "{$workspace}/".self::ANIMATION_FILE;
        File::ensureDirectoryExists($workspace);
        if (File::put($animationPath, $animationJson) === false) {
            return ['failure' => StickerRenderer::RENDERER_UNAVAILABLE];
        }

        return $this->renderers->renderer()->render($animationPath, "{$workspace}/".self::RENDER_OUTPUT_DIRECTORY);
    }
}
