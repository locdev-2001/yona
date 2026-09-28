<?php

namespace App\Services\Stickers;

// Hợp đồng trung tính của trình dựng sticker từ ảnh. Driver cụ thể chọn qua
// config('yona.stickers.renderer'); pipeline chỉ biết hợp đồng này. Mã lỗi cũng
// là khoá bản dịch errors.sticker_uploads.*.
interface StickerRenderer
{
    public const RENDER_FAILED = 'render_failed';

    public const RENDER_TIMEOUT = 'render_timeout';

    public const RENDERER_UNAVAILABLE = 'renderer_unavailable';

    public const IMAGE_UNREADABLE = 'image_unreadable';

    public const IMAGE_TOO_LARGE = 'image_too_large';

    public const TOO_MANY_FRAMES = 'too_many_frames';

    // Xoá nền xong không còn điểm ảnh nào: sticker sẽ trong suốt hoàn toàn.
    public const IMAGE_EMPTY = 'image_empty';

    /**
     * Cắt, xoá nền theo `$edit` (hợp đồng edit của kho sticker; rỗng = mặc định
     * của trình dựng) rồi dựng vào $outputDirectory ba tệp vuông: `image_path`
     * WebP cạnh $size (động nếu ảnh gốc động), `static_path` PNG tĩnh cạnh
     * $staticSize và `gif_path` GIF cạnh $staticSize (động như ảnh gốc, trong
     * suốt 1 bit) cho kênh ngoài.
     * Thất bại trả mã lỗi ổn định thay vì ném, và không để lại tệp.
     *
     * @param  array<string, mixed>  $edit
     * @return array{image_path: string, static_path: string, gif_path: string, width: int, height: int, frames: int, duration_ms: int}|array{failure: string}
     */
    public function render(string $imagePath, string $outputDirectory, array $edit, int $size, int $staticSize): array;
}
