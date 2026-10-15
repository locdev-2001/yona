<?php

use App\Agent\Inference\Gateway\ModelRouter;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\ProviderBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolResultBlock;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Agent\Inference\GatewayTestKit;

// Hợp đồng hai bước: khối suy luận của bước gọi công cụ phải quay lại nguyên văn ở bước
// gửi kết quả công cụ (thiếu là nhà cung cấp trả 400). Tuyến khác thì bỏ và báo trượt cache.

beforeEach(function () {
    GatewayTestKit::configure();
    GatewayTestKit::useApiCallLog();
    Http::preventStrayRequests();
});

function secondStepPrompt(ModelResponse $firstStep): Prompt
{
    return new Prompt(GatewayTestKit::system(), GatewayTestKit::tools(), [
        new PromptMessage(MessageRole::User, [new TextBlock('Áo thun trắng còn size M không shop?')]),
        new PromptMessage(MessageRole::Assistant, $firstStep->content),
        new PromptMessage(MessageRole::User, [new ToolResultBlock($firstStep->toolCalls()[0]->id, '{"ok":true,"data":[]}')]),
    ], historyCacheBreakpoint: 0);
}

/** @return array<string, mixed> */
function lastSentBody(): array
{
    $bodies = Http::recorded()->map(fn (array $pair) => json_decode($pair[0]->body(), true))->values()->all();

    return end($bodies);
}

dataset('reasoning protocols', [
    'anthropic messages: thinking + redacted_thinking' => [
        'anthropic_messages', 'thinking_tool', 'anthropic_only', GatewayTestKit::ANTHROPIC_HOST, new ModelRoute('anthropic', 'claude-test'),
        fn (array $fixture) => array_slice($fixture['content'], 0, 2),
        fn (array $body) => array_values(array_filter($body['messages'][1]['content'], fn (array $block) => str_contains($block['type'], 'thinking'))),
    ],
    'openrouter chat: reasoning_details' => [
        'openai_chat', 'reasoning_tool', 'openrouter_only', GatewayTestKit::OPENROUTER_HOST, new ModelRoute('openrouter', 'anthropic/claude-test'),
        fn (array $fixture) => $fixture['choices'][0]['message']['reasoning_details'],
        fn (array $body) => $body['messages'][2]['reasoning_details'] ?? [],
    ],
]);

it('replays the provider reasoning verbatim on the tool result step of the same route', function (
    string $protocol, string $fixtureName, string $alias, string $host, ModelRoute $route, Closure $expectedBlocks, Closure $sentBlocks,
) {
    $fixture = GatewayTestKit::fixture($protocol, $fixtureName);
    Http::fake([$host.'/*' => Http::sequence()
        ->push($fixture)
        ->push(GatewayTestKit::fixture($protocol, 'text'))]);

    $firstStep = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: $alias));
    $providerBlocks = array_values(array_filter($firstStep->content, fn ($block) => $block instanceof ProviderBlock));

    expect($firstStep->finishReason)->toBe(FinishReason::ToolUse)
        ->and($providerBlocks)->not->toBeEmpty()
        ->and(array_map(fn (ProviderBlock $block) => $block->route, $providerBlocks))->each->toEqual($route);

    $secondStep = GatewayTestKit::model()->complete(GatewayTestKit::request(prompt: secondStepPrompt($firstStep), alias: $alias));

    expect($secondStep->finishReason)->toBe(FinishReason::EndTurn)
        ->and($secondStep->usage->cacheMissReason)->toBeNull()
        ->and($sentBlocks(lastSentBody()))->toBe($expectedBlocks($fixture));
})->with('reasoning protocols');

it('keeps reasoning blocks ahead of the tool call they accompanied', function () {
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::sequence()
        ->push(GatewayTestKit::fixture('anthropic_messages', 'thinking_tool'))
        ->push(GatewayTestKit::fixture('anthropic_messages', 'text'))]);

    $firstStep = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'anthropic_only'));
    GatewayTestKit::model()->complete(GatewayTestKit::request(prompt: secondStepPrompt($firstStep), alias: 'anthropic_only'));

    expect(array_column(lastSentBody()['messages'][1]['content'], 'type'))->toBe(['thinking', 'redacted_thinking', 'tool_use']);
});

it('drops reasoning of another route and reports the cache miss', function (string $firstAlias, string $firstProtocol, string $fixtureName, string $secondAlias, string $secondProtocol) {
    $firstHost = $firstProtocol === 'anthropic_messages' ? GatewayTestKit::ANTHROPIC_HOST : GatewayTestKit::OPENROUTER_HOST;
    $secondHost = $secondProtocol === 'anthropic_messages' ? GatewayTestKit::ANTHROPIC_HOST : GatewayTestKit::OPENROUTER_HOST;
    Http::fake([
        $firstHost.'/*' => Http::response(GatewayTestKit::fixture($firstProtocol, $fixtureName)),
    ]);
    $firstStep = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: $firstAlias));

    Http::fake([$secondHost.'/*' => Http::response(GatewayTestKit::fixture($secondProtocol, 'text'))]);
    $secondStep = GatewayTestKit::model()->complete(GatewayTestKit::request(prompt: secondStepPrompt($firstStep), alias: $secondAlias));
    $sent = json_encode(lastSentBody());

    expect($secondStep->usage->cacheMissReason)->toBe(ModelRouter::CACHE_MISS_ROUTE_CHANGED)
        ->and($sent)->not->toContain('thinking')
        ->and($sent)->not->toContain('reasoning_details')
        ->and($sent)->toContain('search_knowledge');
})->with([
    'anthropic thinking sent to openrouter' => ['anthropic_only', 'anthropic_messages', 'thinking_tool', 'openrouter_only', 'openai_chat'],
    'openrouter reasoning sent to anthropic' => ['openrouter_only', 'openai_chat', 'reasoning_tool', 'anthropic_only', 'anthropic_messages'],
]);

it('never marks a reasoning block as a cache breakpoint', function () {
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::sequence()
        ->push(GatewayTestKit::fixture('anthropic_messages', 'thinking_tool'))
        ->push(GatewayTestKit::fixture('anthropic_messages', 'text'))]);
    $firstStep = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'anthropic_only'));
    $prompt = secondStepPrompt($firstStep);

    GatewayTestKit::model()->complete(GatewayTestKit::request(
        prompt: new Prompt($prompt->system, $prompt->tools, $prompt->messages, historyCacheBreakpoint: 1),
        alias: 'anthropic_only',
    ));
    $assistant = lastSentBody()['messages'][1]['content'];

    expect(array_key_exists('cache_control', $assistant[0]))->toBeFalse()
        ->and(array_key_exists('cache_control', $assistant[1]))->toBeFalse()
        ->and($assistant[2]['cache_control'])->toBe(['type' => 'ephemeral']);
});
