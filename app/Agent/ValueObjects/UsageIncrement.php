<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Phần cộng thêm vào số liệu tổng kết của một nhân viên AI tại lúc ghi: một lần gọi mô
// hình hoặc một lượt kết thúc.
final readonly class UsageIncrement
{
    public function __construct(
        public int $accountId,
        public int $aiAgentId,
        public int $turns = 0,
        public int $replies = 0,
        public int $handoffs = 0,
        public int $failedTurns = 0,
        public int $modelCalls = 0,
        public int $failedCalls = 0,
        public int $routeChanges = 0,
        public int $latencyMs = 0,
        public int $inputTokens = 0,
        public int $outputTokens = 0,
        public int $cacheReadTokens = 0,
        public int $cacheWriteTokens = 0,
        public int $costMicroUsd = 0,
    ) {
        if ($accountId <= 0 || $aiAgentId <= 0) {
            throw new InvalidArgumentException('Usage increment needs an account and an AI agent.');
        }

        foreach ([$turns, $replies, $handoffs, $failedTurns, $modelCalls, $failedCalls, $routeChanges,
            $latencyMs, $inputTokens, $outputTokens, $cacheReadTokens, $cacheWriteTokens, $costMicroUsd] as $value) {
            if ($value < 0) {
                throw new InvalidArgumentException('Usage increments must not be negative.');
            }
        }
    }

    // Một lần gọi HTTP tới nhà cung cấp: lỗi hay không, có chạy trên tuyến khác tuyến
    // chính (tuyến dự phòng, hoặc mang khối của tuyến khác nên trượt cache) hay không.
    public static function modelCall(int $accountId, int $aiAgentId, Usage $usage, bool $failed, bool $routeChanged): self
    {
        return new self(
            $accountId,
            $aiAgentId,
            modelCalls: 1,
            failedCalls: $failed ? 1 : 0,
            routeChanges: $routeChanged ? 1 : 0,
            latencyMs: $usage->latencyMs,
            inputTokens: $usage->inputTokens,
            outputTokens: $usage->outputTokens,
            cacheReadTokens: $usage->cacheReadTokens,
            cacheWriteTokens: $usage->cacheWriteTokens,
            costMicroUsd: $usage->costMicroUsd,
        );
    }
}
