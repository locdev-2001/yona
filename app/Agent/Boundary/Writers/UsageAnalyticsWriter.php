<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Contracts\Ports\UsageMeter;
use App\Agent\ValueObjects\UsageIncrement;
use App\Models\AiUsageAnalytic;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Throwable;

final class UsageAnalyticsWriter implements UsageMeter
{
    public function add(UsageIncrement $increment): void
    {
        try {
            AiUsageAnalytic::accumulate($increment->accountId, $increment->aiAgentId, [
                'turns' => $increment->turns,
                'replies' => $increment->replies,
                'handoffs' => $increment->handoffs,
                'failed_turns' => $increment->failedTurns,
                'unsourced_blocks' => $increment->unsourcedBlocks,
                'model_calls' => $increment->modelCalls,
                'failed_calls' => $increment->failedCalls,
                'route_changes' => $increment->routeChanges,
                'latency_ms_total' => $increment->latencyMs,
                'input_tokens' => $increment->inputTokens,
                'output_tokens' => $increment->outputTokens,
                'cache_read_tokens' => $increment->cacheReadTokens,
                'cache_write_tokens' => $increment->cacheWriteTokens,
                'cost_micro_usd' => $increment->costMicroUsd,
            ], CarbonImmutable::now());
        } catch (Throwable $exception) {
            Log::warning('agent.usage.write_failed', [
                'account_id' => $increment->accountId,
                'ai_agent_id' => $increment->aiAgentId,
                'error' => $exception::class,
            ]);
        }
    }
}
