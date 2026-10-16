<?php

use App\Agent\Inference\Gateway\ModelRouter;
use App\Agent\Inference\Gateway\RouteTable;
use App\Agent\Inference\Gateway\Throttle\CircuitBreaker;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelErrorKind;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\ProviderBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\Feature\Agent\Inference\GatewayTestKit;
use Tests\Feature\Agent\Inference\RecordingApiCallLog;
use Tests\Feature\Agent\Inference\RecordingUsageMeter;

beforeEach(function () {
    Carbon::setTestNow('2026-10-15 09:00:00');
    Sleep::fake(syncWithCarbon: true);
    GatewayTestKit::configure();
    Http::preventStrayRequests();
});

function routerOk(): array
{
    return GatewayTestKit::fixture('openai_chat', 'text');
}

function anthropicOk(): array
{
    return GatewayTestKit::fixture('anthropic_messages', 'text');
}

function sentTo(string $host): int
{
    return Http::recorded(fn (Request $request) => str_contains($request->url(), $host))->count();
}

it('retries a rate-limited route once, then falls back to the next route', function () {
    $log = GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(['type' => 'error', 'error' => ['type' => 'rate_limit_error', 'message' => 'Rate limited']], 429),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->finishReason)->toBe(FinishReason::EndTurn)
        ->and($response->route)->toEqual(new ModelRoute('openrouter', 'anthropic/claude-test'))
        ->and($response->usage->cacheMissReason)->toBe(ModelRouter::CACHE_MISS_ROUTE_CHANGED)
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(2)
        ->and(sentTo(GatewayTestKit::OPENROUTER_HOST))->toBe(1);
    Sleep::assertSleptTimes(1);

    // Một dòng api_logs cho mỗi lần gọi HTTP, kể cả lần thử lại và lần đổi tuyến.
    expect($log->records)->toHaveCount(3)
        ->and(array_map(fn ($record) => [$record->provider, $record->httpStatus, $record->errorCode], $log->records))->toBe([
            ['anthropic', 429, 'retryable'],
            ['anthropic', 429, 'retryable'],
            ['openrouter', 200, null],
        ])
        ->and($log->records[2]->accountId)->toBe(GatewayTestKit::ACCOUNT_ID)
        ->and($log->records[2]->conversationId)->toBe(GatewayTestKit::CONVERSATION_ID)
        ->and($log->records[2]->aiAgentId)->toBe(GatewayTestKit::AI_AGENT_ID)
        ->and($log->records[2]->inputTokens)->toBe(120)
        ->and($log->records[2]->cacheReadTokens)->toBe(1500)
        ->and($log->records[2]->response['choices'][0]['message']['content'])->toBe('Dạ áo size M còn hàng ạ.')
        ->and($log->records[0]->request['model'])->toBe('claude-test');
});

it('honours the Retry-After advice of the provider', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::sequence()
            ->push(['type' => 'error', 'error' => ['type' => 'overloaded_error', 'message' => 'Overloaded']], 529, ['retry-after' => '3'])
            ->push(anthropicOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->route)->toEqual(new ModelRoute('anthropic', 'claude-test'))
        ->and($response->usage->cacheMissReason)->toBeNull();
    Sleep::assertSequence([Sleep::for(3000)->milliseconds()]);
});

dataset('stopping errors', [
    'invalid request' => [400, ['type' => 'error', 'error' => ['type' => 'invalid_request_error', 'message' => 'messages.0.content: field required']], ModelErrorKind::InvalidRequest],
    'context exceeded' => [400, ['type' => 'error', 'error' => ['type' => 'invalid_request_error', 'message' => 'prompt is too long: 208310 tokens > 200000 maximum']], ModelErrorKind::ContextExceeded],
]);

it('stops without trying the next route when switching cannot help', function (int $status, array $body, ModelErrorKind $kind) {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response($body, $status),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->finishReason)->toBe(FinishReason::Error)
        ->and($response->error->kind)->toBe($kind)
        ->and($response->error->httpStatus)->toBe(400)
        ->and($response->route)->toEqual(new ModelRoute('anthropic', 'claude-test'))
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(1)
        ->and(sentTo(GatewayTestKit::OPENROUTER_HOST))->toBe(0);
    Sleep::assertNeverSlept();
})->with('stopping errors');

it('classifies an OpenAI-style context_length_exceeded as context exceeded', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([GatewayTestKit::OPENAI_HOST.'/*' => Http::response(['error' => [
        'message' => "This model's maximum context length is 128000 tokens.",
        'type' => 'invalid_request_error',
        'param' => 'messages',
        'code' => 'context_length_exceeded',
    ]], 400)]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'openai_only'));

    expect($response->error->kind)->toBe(ModelErrorKind::ContextExceeded);
});

it('moves to the next route on an authentication failure without retrying', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(['type' => 'error', 'error' => ['type' => 'authentication_error', 'message' => 'invalid x-api-key']], 401),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->route->provider)->toBe('openrouter')
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(1);
    Sleep::assertNeverSlept();
});

it('treats dropped connections and garbage bodies as temporary failures', function (Closure $firstRoute) {
    $log = GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => $firstRoute,
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->route->provider)->toBe('openrouter')
        ->and(array_map(fn ($record) => [$record->provider, $record->errorCode], $log->records))->toBe([
            ['anthropic', 'retryable'],
            ['anthropic', 'retryable'],
            ['openrouter', null],
        ]);
})->with([
    'connection dropped' => fn () => fn () => throw new ConnectionException('cURL error 28: Operation timed out'),
    'html instead of json' => fn () => fn () => Http::response('<html>Bad gateway</html>', 200),
    'json without content' => fn () => fn () => Http::response(['id' => 'msg_01'], 200),
]);

it('treats an error reported inside a 200 body as a provider failure', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::sequence()
            ->push(['error' => ['code' => 502, 'message' => 'Upstream provider returned an invalid response']])
            ->push(['id' => 'gen-1', 'choices' => [['index' => 0, 'finish_reason' => 'error', 'message' => ['role' => 'assistant', 'content' => 'Dạ']]]])
            ->push(routerOk()),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'openrouter_only'));

    expect($response->finishReason)->toBe(FinishReason::Error)
        ->and($response->error->kind)->toBe(ModelErrorKind::Retryable)
        ->and(sentTo(GatewayTestKit::OPENROUTER_HOST))->toBe(2);
});

it('does not retry when the deadline leaves no room for another call', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(['type' => 'error', 'error' => ['type' => 'api_error', 'message' => 'Internal']], 500)]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'anthropic_only', deadlineSeconds: 3));

    expect($response->error->kind)->toBe(ModelErrorKind::Retryable)
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(1);
    Sleep::assertNeverSlept();
});

it('makes no call at all once the deadline has passed', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake();

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(deadlineSeconds: 1));

    expect($response->error->kind)->toBe(ModelErrorKind::Unavailable);
    Http::assertNothingSent();
});

it('skips a route whose circuit is open', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(anthropicOk()),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);
    $anthropic = app(RouteTable::class)->routesFor('main')[0];
    $breaker = app(CircuitBreaker::class);

    foreach (range(1, 3) as $failure) {
        $breaker->recordFailure($anthropic);
    }

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->route->provider)->toBe('openrouter')
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(0);

    Carbon::setTestNow(Carbon::now()->addMinutes(2));
    expect($breaker->isOpen($anthropic))->toBeFalse();
});

it('opens the circuit after repeated temporary failures', function () {
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(['type' => 'error', 'error' => ['type' => 'overloaded_error', 'message' => 'Overloaded']], 529),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    GatewayTestKit::model()->complete(GatewayTestKit::request());
    GatewayTestKit::model()->complete(GatewayTestKit::request());

    // Lượt đầu 2 lỗi, lượt hai 1 lỗi chạm ngưỡng 3: mạch mở, lượt thứ ba không gọi tuyến hỏng.
    expect(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(3);

    GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(3)
        ->and(sentTo(GatewayTestKit::OPENROUTER_HOST))->toBe(3);
});

it('skips a route whose API key is missing', function () {
    GatewayTestKit::useApiCallLog();
    config(['agent.providers.anthropic.api_key' => null]);
    Http::fake([GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk())]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->route->provider)->toBe('openrouter')
        ->and($response->usage->cacheMissReason)->toBeNull()
        ->and(sentTo(GatewayTestKit::ANTHROPIC_HOST))->toBe(0);
});

it('reports unavailable when no route of the alias has a key', function () {
    GatewayTestKit::useApiCallLog();
    config(['agent.providers.anthropic.api_key' => '', 'agent.providers.openrouter.api_key' => null]);
    Http::fake();

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->error->kind)->toBe(ModelErrorKind::Unavailable)
        ->and($response->route)->toBeNull();
    Http::assertNothingSent();
});

it('uses the model configured for a special AI agent and the default for the others', function () {
    GatewayTestKit::configure(agentModels: [42 => 'openai_only']);
    GatewayTestKit::useApiCallLog();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(anthropicOk()),
        GatewayTestKit::OPENAI_HOST.'/*' => Http::response(routerOk()),
    ]);

    $special = GatewayTestKit::model()->complete(GatewayTestKit::request(aiAgentId: 42));
    $regular = GatewayTestKit::model()->complete(GatewayTestKit::request(aiAgentId: 7));
    $explicit = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'anthropic_only', aiAgentId: 42));

    expect($special->route)->toEqual(new ModelRoute('openai', 'gpt-test'))
        ->and($regular->route)->toEqual(new ModelRoute('anthropic', 'claude-test'))
        ->and($explicit->route)->toEqual(new ModelRoute('anthropic', 'claude-test'));
});

it('adds every HTTP call to the AI agent usage: failed calls, calls on a fallback route, tokens and cost', function () {
    $meter = GatewayTestKit::useUsageMeter();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(['type' => 'error', 'error' => ['type' => 'rate_limit_error', 'message' => 'Rate limited']], 429),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(routerOk()),
    ]);

    GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect(array_map(fn ($increment) => [$increment->modelCalls, $increment->failedCalls, $increment->routeChanges], $meter->increments))->toBe([
        [1, 1, 0],
        [1, 1, 0],
        [1, 0, 1],
    ]);
    $fallback = $meter->increments[2];
    expect($fallback->accountId)->toBe(GatewayTestKit::ACCOUNT_ID)
        ->and($fallback->aiAgentId)->toBe(GatewayTestKit::AI_AGENT_ID)
        ->and($fallback->inputTokens)->toBe(120)
        ->and($fallback->cacheReadTokens)->toBe(1500)
        ->and($fallback->costMicroUsd)->toBeGreaterThan(0)
        ->and($fallback->turns)->toBe(0);
});

it('counts a call on the main route as a route change when the turn carries blocks of another route', function () {
    $meter = GatewayTestKit::useUsageMeter();
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(anthropicOk())]);

    $first = GatewayTestKit::turnPrompt();
    $prompt = new Prompt($first->system, $first->tools, [
        ...$first->messages,
        new PromptMessage(MessageRole::Assistant, [
            new ProviderBlock('reasoning_details', new ModelRoute('openrouter', 'anthropic/claude-test'), ['reasoning_details' => [['type' => 'reasoning.text', 'text' => '...']]]),
            new ToolCall('toolu_02', 'search_knowledge', ['query' => 'size M']),
        ]),
        new PromptMessage(MessageRole::User, [new ToolResultBlock('toolu_02', '{"ok":true}')]),
    ]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(prompt: $prompt));

    expect($response->usage->cacheMissReason)->toBe(ModelRouter::CACHE_MISS_ROUTE_CHANGED)
        ->and($meter->increments)->toHaveCount(1)
        ->and($meter->increments[0]->routeChanges)->toBe(1);
});

it('leaves calls without an AI agent out of the usage', function () {
    $meter = GatewayTestKit::useUsageMeter();
    $log = GatewayTestKit::useApiCallLog();
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(anthropicOk())]);

    GatewayTestKit::model()->complete(GatewayTestKit::request(aiAgentId: null));

    expect($meter->increments)->toBe([])
        ->and($log->records)->toHaveCount(1);
});

it('keeps the turn going when writing the API log or the usage fails', function () {
    GatewayTestKit::useApiCallLog(new RecordingApiCallLog(fails: true));
    GatewayTestKit::useUsageMeter(new RecordingUsageMeter(fails: true));
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(anthropicOk())]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request());

    expect($response->finishReason)->toBe(FinishReason::EndTurn);
});

it('rejects a malformed route config loudly', function () {
    config(['agent.models.broken' => ['routes' => [['provider' => 'nowhere', 'model' => 'x']]]]);

    app(RouteTable::class)->routesFor('broken');
})->throws(InvalidArgumentException::class, 'unknown provider `nowhere`');
