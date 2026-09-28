<?php

namespace Tests\Support;

use App\Services\Stickers\StickerRenderer;
use Closure;
use Illuminate\Support\Facades\File;

// Trình dựng giả theo hợp đồng StickerRenderer: test đi trọn luồng tải lên → job
// → ready mà không cần Node. Ghi lại mọi lượt gọi; `scenario` thay kết quả khi
// test cần lỗi hoặc tệp khác.
final class FakeStickerRenderer implements StickerRenderer
{
    private const CONTAINER_KEY = 'tests.fake-sticker-renderer';

    /** @var (Closure(string, string, array<string, mixed>, int, int): array<string, mixed>)|null */
    public ?Closure $scenario = null;

    /** @var list<array{image_bytes: string, image_path: string, output_directory: string, edit: array<string, mixed>, size: int, static_size: int}> */
    public array $calls = [];

    public static function install(): self
    {
        $renderer = new self;
        app()->instance(self::CONTAINER_KEY, $renderer);
        config(['yona.stickers.renderer' => 'fake', 'yona.stickers.renderers.fake.class' => self::CONTAINER_KEY]);

        return $renderer;
    }

    public function render(string $imagePath, string $outputDirectory, array $edit, int $size, int $staticSize): array
    {
        $this->calls[] = [
            'image_bytes' => (string) file_get_contents($imagePath),
            'image_path' => $imagePath,
            'output_directory' => $outputDirectory,
            'edit' => $edit,
            'size' => $size,
            'static_size' => $staticSize,
        ];

        if ($this->scenario !== null) {
            return ($this->scenario)($imagePath, $outputDirectory, $edit, $size, $staticSize);
        }

        return self::writeOutputs($outputDirectory, $size);
    }

    /** @return array{image_path: string, static_path: string, gif_path: string, width: int, height: int, frames: int, duration_ms: int} */
    public static function writeOutputs(string $outputDirectory, int $size, string $imageBytes = 'sticker-webp', string $staticBytes = 'static-png', int $frames = 1, string $gifBytes = 'sticker-gif'): array
    {
        File::ensureDirectoryExists($outputDirectory);
        File::put("{$outputDirectory}/sticker.webp", $imageBytes);
        File::put("{$outputDirectory}/static.png", $staticBytes);
        File::put("{$outputDirectory}/sticker.gif", $gifBytes);

        return [
            'image_path' => "{$outputDirectory}/sticker.webp",
            'static_path' => "{$outputDirectory}/static.png",
            'gif_path' => "{$outputDirectory}/sticker.gif",
            'width' => $size,
            'height' => $size,
            'frames' => $frames,
            'duration_ms' => $frames > 1 ? $frames * 100 : 0,
        ];
    }
}
