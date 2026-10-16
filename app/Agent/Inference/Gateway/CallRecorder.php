<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\Contracts\Ports\UsageMeter;
use App\Agent\ValueObjects\ApiCallRecord;
use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\Usage;
use App\Agent\ValueObjects\UsageIncrement;
use Psr\Log\LoggerInterface;
use Throwable;

// Mỗi lần gọi HTTP tới nhà cung cấp: một dòng nhật ký và phần cộng vào số liệu tổng kết
// của nhân viên AI (lời gọi không gắn nhân viên AI, như lệnh kiểm tuyến, chỉ có nhật ký).
// Thân request không chứa khoá (khoá chỉ nằm ở header). Ghi hỏng chỉ cảnh báo, không bao
// giờ làm hỏng lượt.
final class CallRecorder
{
    public function __construct(
        private readonly ApiCallLog $log,
        private readonly UsageMeter $meter,
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
        bool $routeChanged,
    ): void {
        $this->meter($request, $error, $usage, $routeChanged);

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

    private function meter(ModelRequest $request, ?ModelError $error, Usage $usage, bool $routeChanged): void
    {
        if ($request->aiAgentId === null) {
            return;
        }

        try {
            $this->meter->add(UsageIncrement::modelCall($request->accountId, $request->aiAgentId, $usage, $error !== null, $routeChanged));
        } catch (Throwable $exception) {
            $this->logger->warning('agent.gateway.usage_failed', [
                'account_id' => $request->accountId,
                'exception' => $exception::class,
            ]);
        }
    }
}
