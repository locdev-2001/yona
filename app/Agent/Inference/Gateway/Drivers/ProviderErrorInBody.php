<?php

namespace App\Agent\Inference\Gateway\Drivers;

use RuntimeException;

// Nhà cung cấp trả HTTP 2xx nhưng thân là lỗi (cổng trung gian báo lỗi sau khi đã gửi header).
final class ProviderErrorInBody extends RuntimeException
{
    /** @param array<string, mixed> $body */
    public function __construct(public readonly int $status, public readonly array $body)
    {
        parent::__construct("Provider reported an error in a successful response (status {$status}).");
    }
}
