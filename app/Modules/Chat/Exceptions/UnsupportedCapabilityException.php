<?php

namespace App\Modules\Chat\Exceptions;

use RuntimeException;

/**
 * Lõi yêu cầu một diện tương tác mà kênh không khai báo hỗ trợ.
 *
 * Mang theo `capability` + `channel` để tầng biên dịch thành mã lỗi cho FE mà
 * không phải đoán từ chuỗi thông báo.
 */
final class UnsupportedCapabilityException extends RuntimeException
{
    public function __construct(
        public readonly string $capability,
        public readonly string $channel,
    ) {
        parent::__construct("Kênh {$channel} không hỗ trợ {$capability}.");
    }

    public function errorCode(): string
    {
        return $this->capability.'_unsupported';
    }
}
