<?php

namespace App\Http\Resources\Stickers;

use App\Models\StickerMcpToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Một token sticker trong danh sách của Cài đặt. Không bao giờ có token thô:
// token thô chỉ nằm trong phản hồi lúc tạo.
/** @mixin StickerMcpToken */
class StickerMcpTokenResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'scope' => $this->scope,
            'created_by' => $this->user?->name,
            'created_at' => $this->created_at?->toIso8601String(),
            'last_used_at' => $this->last_used_at?->toIso8601String(),
        ];
    }
}
