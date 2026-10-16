<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Một lần gọi API nhà cung cấp mô hình, để ghi nhật ký (lõi giữ vĩnh viễn). Trường khớp
// một-một với cột của bảng api_logs.
final readonly class ApiCallRecord
{
    /**
     * @param  array<string, mixed>  $request  thân request đã gửi (không chứa khoá API)
     * @param  array<string, mixed>|null  $response  thân phản hồi; null khi không nhận được
     */
    public function __construct(
        public int $accountId,
        public ?int $conversationId,
        public ?int $aiAgentId,
        public string $provider,
        public string $model,
        public ?int $httpStatus,
        public ?string $errorCode,
        public array $request,
        public ?array $response,
        public int $inputTokens = 0,
        public int $outputTokens = 0,
        public int $cacheReadTokens = 0,
        public int $cacheWriteTokens = 0,
        public int $costMicroUsd = 0,
        public int $latencyMs = 0,
    ) {
        if ($accountId <= 0 || $provider === '' || $model === '') {
            throw new InvalidArgumentException('API call record needs an account, a provider and a model.');
        }

        foreach ([$inputTokens, $outputTokens, $cacheReadTokens, $cacheWriteTokens, $costMicroUsd, $latencyMs] as $value) {
            if ($value < 0) {
                throw new InvalidArgumentException('API call counters must not be negative.');
            }
        }
    }
}
