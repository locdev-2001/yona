<?php

namespace App\Services\Stickers;

use UnexpectedValueException;

// Chỗ duy nhất chọn driver dựng ảnh sticker theo config('yona.stickers.renderer'):
// job dựng ảnh khi upload và bản xem trước cho AI dùng chung.
final class StickerRendererResolver
{
    public function renderer(): StickerRenderer
    {
        $driver = (string) config('yona.stickers.renderer');
        $renderer = app((string) config("yona.stickers.renderers.{$driver}.class"));

        if (! $renderer instanceof StickerRenderer) {
            throw new UnexpectedValueException("Sticker renderer [{$driver}] does not implement ".StickerRenderer::class.'.');
        }

        return $renderer;
    }
}
