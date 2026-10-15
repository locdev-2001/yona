<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\ValueObjects\ApiCallRecord;
use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\Usage;
use Psr\Log\LoggerInterface;
use Throwable;

// Ghi một dòng nhật ký cho mỗi lần gọi HTTP tới nhà cung cấp. Thân request không chứa
// khoá (khoá chỉ nằm ở header). Ghi hỏng chỉ cảnh báo, không bao giờ làm hỏng lượt.
final class CallRecorder
{
    public function __construct(
        private readonly ApiCallLog $log,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * @param  array<string, mixed>  $requestBody
     * @param  array<string, mixed>|null  $responseBody
     */
    public function record(
        ModelRequest $request,
        Route $route,
        ?int $httpStatus,
        ?ModelError $error,
        array $requestBody,
        ?array $responseBody,
        Usage $usage,
    ): void {
        try {
            $this->log->record(new ApiCallRecord(
                accountId: $request->accountId,
                conversationId: $request->conversationId,
                aiAgentId: $request->aiAgentId,
                provider: $route->provider,
                model: $route->model,
                httpStatus: $httpStatus,
                errorCode: $error?->kind->value,
                request: $requestBody,
                response: $responseBody,
                inputTokens: $usage->inputTokens,
                outputTokens: $usage->outputTokens,
                cacheReadTokens: $usage->cacheReadTokens,
                cacheWriteTokens: $usage->cacheWriteTokens,
                costMicroUsd: $usage->costMicroUsd,
                latencyMs: $usage->latencyMs,
            ));
        } catch (Throwable $exception) {
            $this->logger->warning('agent.gateway.api_log_failed', [
                'provider' => $route->provider,
                'model' => $route->model,
                'exception' => $exception::class,
            ]);
        }
    }
}
