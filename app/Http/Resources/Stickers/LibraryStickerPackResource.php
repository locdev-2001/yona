<?php

namespace App\Http\Resources\Stickers;

use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Bộ sticker trong màn quản trị kho. Danh sách bộ chỉ cần ảnh bìa + số lượng;
// chi tiết bộ kèm toàn bộ sticker theo thứ tự hiển thị.
class LibraryStickerPackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var StickerPack $pack */
        $pack = $this->resource;
        /** @var Sticker|null $cover */
        $cover = $pack->relationLoaded('stickers') ? $pack->stickers->firstWhere('status', Sticker::STATUS_READY) : null;

        return [
            'id' => $pack->id,
            'name' => $pack->name,
            'published' => $pack->published_at !== null,
            'published_at' => $pack->published_at?->toIso8601String(),
            'stickers_count' => $pack->stickers_count ?? ($pack->relationLoaded('stickers') ? $pack->stickers->count() : null),
            'cover_url' => $cover?->poster_url,
        ];
    }

    /** @return array<string, mixed> */
    public static function detail(StickerPack $pack, Request $request): array
    {
        $pack->load(['stickers' => fn ($query) => $query->orderBy('position')->orderBy('id')]);

        return [
            ...(new self($pack))->toArray($request),
            'stickers' => LibraryStickerResource::collection($pack->stickers)->toArray($request),
        ];
    }
}
