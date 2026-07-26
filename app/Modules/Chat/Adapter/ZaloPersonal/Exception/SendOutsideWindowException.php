<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Exception;

use RuntimeException;

/**
 * F2 — Gửi ngoài cửa sổ 7h-22h giờ VN.
 * HTTP 422 (unprocessable) — không retry được.
 */
class SendOutsideWindowException extends RuntimeException
{
    public function __construct(string $message = 'Chỉ được gửi tin trong khung giờ 7h-22h (giờ Việt Nam).', int $code = 422)
    {
        parent::__construct($message, $code);
    }
}
