<?php

namespace Modules\ChannelZalo\Exceptions;

use RuntimeException;

/**
 * Circuit-breaker OPEN — bridge đã lỗi ≥5 lần trong 1h.
 * UI fallback: hiện "Zalo gặp sự cố — vui lòng gửi tay".
 */
class ZaloCircuitOpenException extends RuntimeException
{
    public function __construct(string $message = 'Kết nối Zalo tạm thời gián đoạn. Vui lòng gửi tin trực tiếp.', int $code = 503)
    {
        parent::__construct($message, $code);
    }
}
