<?php

namespace App\Modules\Integration\Chat\ZaloPersonal\Exceptions;

use RuntimeException;

/**
 * >1 slot 'connected' cho cùng 1 channel_account — không nên xảy ra (partial
 * unique P02g chặn ở DB) nhưng nếu gặp: fail-closed, KHÔNG gửi. Tuyệt đối
 * không chọn ngẫu nhiên `first()` — tránh gửi nhầm qua phiên sai.
 */
class ZaloSplitBrainException extends RuntimeException
{
    public function __construct(string $message = 'Phát hiện nhiều phiên Zalo cùng kết nối cho 1 tài khoản.', int $code = 409)
    {
        parent::__construct($message, $code);
    }
}
