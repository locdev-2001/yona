<?php

namespace App\Agent\Evals;

// Lời gọi mô hình của bộ chấm thuộc account, hội thoại và kịch bản nào; gắn vào nhật ký.
final readonly class EvalCallScope
{
    public function __construct(
        public int $accountId,
        public ?int $conversationId,
        public string $scenarioId,
        public int $timeoutSeconds,
    ) {}
}
