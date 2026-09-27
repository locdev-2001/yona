<?php

namespace App\Http\Resources\Stickers;

use App\Models\Sticker;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Sticker trong màn quản trị kho (Super Admin lẫn tenant). Sticker kẹt
// `processing` quá hạn hiện là hỏng để người quản trị biết mà tải lại.
class LibraryStickerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Sticker $sticker */
        $sticker = $this->resource;
        $stale = $sticker->status === Sticker::STATUS_PROCESSING
            && $sticker->updated_at?->lte(now()->subSeconds(StickerUploadService::STALE_PROCESSING_SECONDS));
        $status = $stale ? Sticker::STATUS_FAILED : $sticker->status;
        $failureCode = $stale ? StickerRenderer::RENDER_TIMEOUT : $sticker->failure_code;

        return [
            'id' => $sticker->id,
            'label' => $sticker->label,
            'status' => $status,
            'failure_message' => $status === Sticker::STATUS_FAILED && $failureCode !== null
                ? __("errors.sticker_uploads.{$failureCode}", LottieDocumentValidator::limitPlaceholders())
                : null,
            'position' => $sticker->position,
            'width' => $sticker->width,
            'height' => $sticker->height,
            'poster_url' => $sticker->poster_url,
            'static_url' => $sticker->static_url,
            'animation_url' => $sticker->animation_url,
        ];
    }
}
