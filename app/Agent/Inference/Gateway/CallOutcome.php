<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\Inference\Gateway\Drivers\Completion;
use App\Agent\Inference\Gateway\Throttle\Failure;
use App\Agent\ValueObjects\Usage;

// Kết quả một lần gọi HTTP: hoặc phản hồi đã đọc, hoặc lỗi đã phân loại; luôn kèm số đo.
final readonly class CallOutcome
{
    private function __construct(
        public Usage $usage,
        public ?Completion $completion = null,
        public ?Failure $failure = null,
    ) {}

    public static function succeeded(Completion $completion, Usage $usage): self
    {
        return new self($usage, completion: $completion);
    }

    public static function failed(Failure $failure, Usage $usage): self
    {
        return new self($usage, failure: $failure);
    }
}
