<?php

namespace App\Http\Resources\Stickers;

use App\Models\Sticker;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Lang;

// Sticker trong màn quản trị kho (Super Admin lẫn tenant). Sticker kẹt
// `processing` quá hạn hiện là hỏng để người quản trị biết mà tải lại. Sticker
// `ready` còn mã lỗi là lượt chỉnh lại ảnh gần nhất không thành, ảnh cũ vẫn dùng.
class LibraryStickerResource extends JsonResource
{
    private const FAILURE_MESSAGE_KEY = 'errors.sticker_uploads.';

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
            'keywords' => $sticker->keywords ?? [],
            'status' => $status,
            'failure_message' => $status !== Sticker::STATUS_PROCESSING && $failureCode !== null ? self::failureMessage($failureCode) : null,
            'position' => $sticker->position,
            'width' => $sticker->width,
            'height' => $sticker->height,
            'frames' => $sticker->frame_count,
            'image_url' => $sticker->image_url,
            'static_url' => $sticker->static_url,
            'edit' => $sticker->edit_params,
            'has_original' => $sticker->original_path !== null,
        ];
    }

    // Mã lỗi không còn câu dịch (mã của một phiên bản trình dựng cũ) hiện như dựng hỏng.
    private static function failureMessage(string $failureCode): string
    {
        $key = Lang::has(self::FAILURE_MESSAGE_KEY.$failureCode) ? $failureCode : StickerRenderer::RENDER_FAILED;

        return __(self::FAILURE_MESSAGE_KEY.$key, StickerUploadService::limitPlaceholders());
    }
}
