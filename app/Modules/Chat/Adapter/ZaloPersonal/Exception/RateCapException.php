<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Exception;

use RuntimeException;

/**
 * F2 — Vượt giới hạn 3 tin QC/số/ngày.
 * HTTP 422 — không retry được trong ngày.
 */
class RateCapException extends RuntimeException
{
    public function __construct(string $message = 'Đã vượt giới hạn 3 tin/số/ngày.', int $code = 422)
    {
        parent::__construct($message, $code);
    }
}
