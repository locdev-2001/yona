<?php

namespace App\Services\Stickers;

use App\Models\Sticker;

// Bản dựng đang dùng của một sticker (hash nội dung + ảnh gốc + thông số chỉnh).
// Chỉnh lại ảnh giữ bản này tới khi bản mới dựng xong: dựng hỏng thì trả về nó.
final class StickerVersion
{
    /** @param  array<string, mixed>|null  $editParams */
    public function __construct(
        public readonly string $contentHash,
        public readonly ?string $originalPath,
        public readonly ?array $editParams,
    ) {}

    public static function of(Sticker $sticker): self
    {
        return new self($sticker->content_hash, $sticker->original_path, $sticker->edit_params);
    }

    /** @return array{content_hash: string, original_path: string|null, edit_params: array<string, mixed>|null} */
    public function attributes(): array
    {
        return [
            'content_hash' => $this->contentHash,
            'original_path' => $this->originalPath,
            'edit_params' => $this->editParams,
        ];
    }
}
