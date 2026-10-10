<?php

namespace App\Channels;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Địa chỉ liên hệ kênh không gửi tới được; thông báo là câu người dùng đọc được. */
final class UndeliverableContactAddress extends RuntimeException
{
    public function render(): JsonResponse
    {
        return response()->json(['error' => $this->getMessage()], 422);
    }
}
