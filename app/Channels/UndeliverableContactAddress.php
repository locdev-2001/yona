<?php

namespace App\Channels;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Địa chỉ liên hệ kênh không gửi tới được; thông báo là câu người dùng đọc được, `reason` là
 * mã máy đọc do kênh đặt (API danh sách hộp thư nhắn được trả nguyên mã này).
 */
final class UndeliverableContactAddress extends RuntimeException
{
    public const DEFAULT_REASON = 'address_undeliverable';

    public function __construct(string $message, public readonly string $reason = self::DEFAULT_REASON)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(['error' => $this->getMessage()], 422);
    }
}
