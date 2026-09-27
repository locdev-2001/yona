<?php

namespace Tests\Support;

use App\Services\Stickers\StickerRenderer;
use Illuminate\Support\Facades\File;

// Trình render giả cho test đi trọn luồng upload → job → ready mà không cần Node.
final class FakeStickerRenderer implements StickerRenderer
{
    private const CONTAINER_KEY = 'tests.fake-sticker-renderer';

    public static function install(): void
    {
        app()->instance(self::CONTAINER_KEY, new self);
        config(['yona.stickers.renderer' => 'fake', 'yona.stickers.renderers.fake.class' => self::CONTAINER_KEY]);
    }

    public function render(string $animationPath, string $outputDirectory): array
    {
        File::ensureDirectoryExists($outputDirectory);
        File::put("{$outputDirectory}/poster.webp", 'poster-bytes');
        File::put("{$outputDirectory}/static.png", 'static-bytes');

        return ['poster_path' => "{$outputDirectory}/poster.webp", 'static_path' => "{$outputDirectory}/static.png", 'poster_frame' => 0];
    }
}
