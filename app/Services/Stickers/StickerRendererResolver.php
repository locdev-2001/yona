<?php

namespace App\Services\Stickers;

use UnexpectedValueException;

// Chỗ duy nhất chọn driver dựng sticker theo config('yona.stickers.renderer'),
// dùng cho cả lượt dựng khi tải lên lẫn lượt dựng lại.
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
