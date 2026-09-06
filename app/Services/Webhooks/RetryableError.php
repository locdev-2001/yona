<?php

namespace App\Services\Webhooks;

use RuntimeException;

// Port từ Webhooks::Trigger::RetryableError — lỗi HTTP mà agent bot được thử lại.
class RetryableError extends RuntimeException
{
    public function __construct(public readonly ?int $status, string $message)
    {
        parent::__construct($message);
    }
}
