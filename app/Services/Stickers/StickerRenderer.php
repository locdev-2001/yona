<?php

namespace App\Services\Stickers;

// Hợp đồng trung tính của trình dựng ảnh tĩnh cho sticker. Driver cụ thể chọn
// qua config('yona.stickers.renderer'); pipeline chỉ biết hợp đồng này.
interface StickerRenderer
{
    public const RENDER_FAILED = 'render_failed';

    public const RENDER_TIMEOUT = 'render_timeout';

    public const RENDERER_UNAVAILABLE = 'renderer_unavailable';

    /**
     * Dựng poster (webp 256px) và ảnh tĩnh (png 512px) vào $outputDirectory.
     * `poster_frame` là số khung Lottie tuyệt đối (cùng hệ với ip/op).
     * Thất bại trả mã lỗi ổn định thay vì ném, và không để lại tệp.
     *
     * @return array{poster_path: string, static_path: string, poster_frame: int|float}|array{failure: string}
     */
    public function render(string $animationPath, string $outputDirectory): array;
}
