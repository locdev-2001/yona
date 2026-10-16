<?php

use App\Agent\Boundary\Writers\UsageAnalyticsWriter;
use App\Agent\ValueObjects\UsageIncrement;
use App\Models\Account;
use App\Models\AiAgent;
use App\Models\AiUsageAnalytic;
use App\Services\AiAgents\AiAgentService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

// Số liệu tổng kết của nhân viên AI: cộng dồn nguyên tử vào dòng giờ (UTC) đang chạy.

function aiAgentFor(Account $account): AiAgent
{
    return app(AiAgentService::class)->create($account, 'Lan', null, null);
}

function callIncrement(AiAgent $aiAgent, int $costMicroUsd, int $latencyMs = 800, bool $failed = false): UsageIncrement
{
    return new UsageIncrement(
        $aiAgent->account_id,
        $aiAgent->id,
        modelCalls: 1,
        failedCalls: $failed ? 1 : 0,
        latencyMs: $latencyMs,
        inputTokens: 100,
        outputTokens: 20,
        cacheReadTokens: 1000,
        costMicroUsd: $costMicroUsd,
    );
}

it('adds two calls of the same hour into one row and starts a new row in the next hour', function () {
    $aiAgent = aiAgentFor(Account::factory()->create());
    $writer = new UsageAnalyticsWriter;

    Carbon::setTestNow('2026-10-16 09:05:00');
    $writer->add(callIncrement($aiAgent, 300));
    Carbon::setTestNow('2026-10-16 09:59:59.999999');
    $writer->add(callIncrement($aiAgent, 500, failed: true));
    Carbon::setTestNow('2026-10-16 10:00:00');
    $writer->add(callIncrement($aiAgent, 700));

    $rows = AiUsageAnalytic::query()->orderBy('period_start')->get();

    expect($rows)->toHaveCount(2)
        ->and($rows->pluck('period')->unique()->all())->toBe([AiUsageAnalytic::PERIOD_HOUR])
        ->and($rows[0]->period_start->toIso8601String())->toBe('2026-10-16T09:00:00+00:00')
        ->and($rows[0]->only(['model_calls', 'failed_calls', 'latency_ms_total', 'input_tokens', 'output_tokens', 'cache_read_tokens', 'cost_micro_usd', 'turns']))
        ->toBe(['model_calls' => 2, 'failed_calls' => 1, 'latency_ms_total' => 1600, 'input_tokens' => 200, 'output_tokens' => 40, 'cache_read_tokens' => 2000, 'cost_micro_usd' => 800, 'turns' => 0])
        ->and($rows[1]->period_start->toIso8601String())->toBe('2026-10-16T10:00:00+00:00')
        ->and($rows[1]->cost_micro_usd)->toBe(700);
});

it('buckets by the UTC hour whatever the time zone of the clock', function () {
    $aiAgent = aiAgentFor(Account::factory()->create());

    Carbon::setTestNow(Carbon::parse('2026-10-16 07:30:00', 'Asia/Ho_Chi_Minh'));
    (new UsageAnalyticsWriter)->add(callIncrement($aiAgent, 300));

    expect(AiUsageAnalytic::query()->sole()->period_start->toIso8601String())->toBe('2026-10-16T00:00:00+00:00');
});

it('keeps the numbers of a deleted AI agent', function () {
    $aiAgent = aiAgentFor(Account::factory()->create());
    (new UsageAnalyticsWriter)->add(callIncrement($aiAgent, 300));

    app(AiAgentService::class)->delete($aiAgent);

    expect(AiAgent::query()->find($aiAgent->id))->toBeNull()
        ->and(AiUsageAnalytic::query()->where('ai_agent_id', $aiAgent->id)->sole()->cost_micro_usd)->toBe(300);
});

it('keeps each account in its own rows and drops them with the account', function () {
    $first = aiAgentFor(Account::factory()->create());
    $second = aiAgentFor(Account::factory()->create());
    $writer = new UsageAnalyticsWriter;

    $writer->add(callIncrement($first, 300));
    $writer->add(callIncrement($second, 500));
    $writer->add(callIncrement($first, 100));

    expect(AiUsageAnalytic::query()->where('account_id', $first->account_id)->sole()->cost_micro_usd)->toBe(400)
        ->and(AiUsageAnalytic::query()->where('account_id', $second->account_id)->sole()->cost_micro_usd)->toBe(500);

    Account::query()->whereKey($first->account_id)->delete();

    expect(AiUsageAnalytic::query()->pluck('account_id')->all())->toBe([$second->account_id]);
});

it('writes nothing for an increment that adds nothing', function () {
    $aiAgent = aiAgentFor(Account::factory()->create());

    (new UsageAnalyticsWriter)->add(new UsageIncrement($aiAgent->account_id, $aiAgent->id));

    expect(AiUsageAnalytic::query()->exists())->toBeFalse();
});

it('only warns when the numbers cannot be written', function () {
    Log::spy();

    (new UsageAnalyticsWriter)->add(new UsageIncrement(999_999_999, 1, turns: 1));

    expect(AiUsageAnalytic::query()->exists())->toBeFalse();
    Log::shouldHaveReceived('warning')->withArgs(fn (string $message) => $message === 'agent.usage.write_failed')->once();
});
