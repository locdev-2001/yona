<?php

namespace App\Services\Webhooks;

use RuntimeException;

// Tương đương SafeFetch::HttpError — mang mã trạng thái để phân loại lỗi thử lại.
class HttpError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
