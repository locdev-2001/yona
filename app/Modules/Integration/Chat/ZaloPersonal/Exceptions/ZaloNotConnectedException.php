<?php

namespace App\Modules\Integration\Chat\ZaloPersonal\Exceptions;

use RuntimeException;

/**
 * Bridge trả 503 not_logged_in hoặc session_lost.
 * UI fallback: hiện badge "Mất kết nối — đăng nhập lại".
 */
class ZaloNotConnectedException extends RuntimeException
{
    public function __construct(string $message = 'Zalo chưa kết nối hoặc phiên đã hết.', int $code = 503)
    {
        parent::__construct($message, $code);
    }
}
