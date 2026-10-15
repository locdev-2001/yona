<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\ValueObjects\ApiCallRecord;
use App\Models\ApiLog;
use Illuminate\Support\Facades\Log;
use Throwable;

final class ApiLogWriter implements ApiCallLog
{
    public function record(ApiCallRecord $call): void
    {
        try {
            ApiLog::query()->create([
                'account_id' => $call->accountId,
                'conversation_id' => $call->conversationId,
                'ai_agent_id' => $call->aiAgentId,
                'provider' => $call->provider,
                'model' => $call->model,
                'http_status' => $call->httpStatus,
                'error_code' => $call->errorCode,
                'request' => $call->request,
                'response' => $call->response,
                'input_tokens' => $call->inputTokens,
                'output_tokens' => $call->outputTokens,
                'cache_read_tokens' => $call->cacheReadTokens,
                'cache_write_tokens' => $call->cacheWriteTokens,
                'cost_micro_usd' => $call->costMicroUsd,
                'latency_ms' => $call->latencyMs,
            ]);
        } catch (Throwable $exception) {
            Log::warning('agent.api_log.write_failed', [
                'account_id' => $call->accountId,
                'provider' => $call->provider,
                'error' => $exception::class,
            ]);
        }
    }
}
