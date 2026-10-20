<?php

namespace App\Services\Calls\Media;

use Illuminate\Http\JsonResponse;
use RuntimeException;
use Throwable;

// Nhà cung cấp phòng media không trả lời được. Người dùng chỉ thấy "chưa gọi được", chi
// tiết nằm ở log.
final class MediaProviderFailed extends RuntimeException
{
    public static function because(string $detail, ?Throwable $previous = null): self
    {
        return new self($detail, 0, $previous);
    }

    public function render(): JsonResponse
    {
        return response()->json(['error' => __('calls.ERRORS.MEDIA_UNAVAILABLE'), 'code' => 'media_unavailable'], 503);
    }
}
