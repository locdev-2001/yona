<?php

use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\ModelRoute;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Agent\Inference\GatewayTestKit;

// Cùng một tình huống phản hồi viết theo wire format của từng giao thức phải ra cùng
// một ModelResponse trung tính (nội dung, lý do dừng, token).

beforeEach(function () {
    GatewayTestKit::configure();
    GatewayTestKit::useApiCallLog();
    Http::preventStrayRequests();
});

dataset('protocols', [
    'anthropic_messages' => ['anthropic_messages', 'anthropic_only', GatewayTestKit::ANTHROPIC_HOST, new ModelRoute('anthropic', 'claude-test')],
    'openai_chat' => ['openai_chat', 'openai_only', GatewayTestKit::OPENAI_HOST, new ModelRoute('openai', 'gpt-test')],
]);

dataset('scenarios', [
    'text' => ['text', FinishReason::EndTurn, [new TextBlock('Dạ áo size M còn hàng ạ.')]],
    'one tool call' => ['one_tool', FinishReason::ToolUse, [
        new ToolCall('toolu_01A09q90qw90lq917835lq9', 'search_knowledge', ['query' => 'áo size M']),
    ]],
    'two tool calls in one response' => ['two_tools', FinishReason::ToolUse, [
        new TextBlock('Em tra giúp anh nhé.'),
        new ToolCall('toolu_01A09q90qw90lq917835lq9', 'search_knowledge', ['query' => 'áo size M']),
        new ToolCall('toolu_01B7xYzK9mN2pQ4rS6tU8vW0', 'lookup_order', ['order_code' => 'DH1024']),
    ]],
    'tool call without arguments' => ['tool_without_args', FinishReason::ToolUse, [
        new ToolCall('toolu_01C3nOaRgS', 'wait_for_customer', []),
    ]],
    'cut at max output' => ['max_output', FinishReason::MaxOutput, [new TextBlock('Dạ shop có nhiều mẫu')]],
    'refusal' => ['refusal', FinishReason::Refusal, [new TextBlock('Xin lỗi, em không hỗ trợ được yêu cầu này.')]],
    'empty response' => ['empty', FinishReason::Empty, []],
]);

it('normalises every scenario to the same neutral response', function (
    string $protocol, string $alias, string $host, ModelRoute $route,
    string $scenario, FinishReason $finishReason, array $content,
) {
    Http::fake([$host.'/*' => Http::response(GatewayTestKit::fixture($protocol, $scenario))]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: $alias));

    expect($response->error)->toBeNull()
        ->and($response->finishReason)->toBe($finishReason)
        ->and($response->content)->toEqual($content)
        ->and($response->route)->toEqual($route)
        ->and($response->usage->inputTokens)->toBe(120)
        ->and($response->usage->outputTokens)->toBe(30)
        ->and($response->usage->cacheReadTokens)->toBe(1500)
        ->and($response->usage->cacheWriteTokens)->toBe(400)
        ->and($response->usage->cacheMissReason)->toBeNull();
})->with('protocols')->with('scenarios');

it('drops a tool call whose arguments were cut off at max output', function () {
    $body = GatewayTestKit::fixture('openai_chat', 'one_tool');
    $body['choices'][0]['finish_reason'] = 'length';
    $body['choices'][0]['message']['tool_calls'][0]['function']['arguments'] = '{"query": "áo si';
    Http::fake([GatewayTestKit::OPENAI_HOST.'/*' => Http::response($body)]);

    $response = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'openai_only'));

    expect($response->finishReason)->toBe(FinishReason::MaxOutput)
        ->and($response->content)->toBe([]);
});

it('shortens provider tool call ids that do not fit every protocol', function () {
    $body = GatewayTestKit::fixture('openai_chat', 'one_tool');
    $body['choices'][0]['message']['tool_calls'][0]['id'] = 'call.'.str_repeat('x', 90);
    Http::fake([GatewayTestKit::OPENAI_HOST.'/*' => Http::response($body)]);

    $call = GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'openai_only'))->toolCalls()[0];

    expect($call->id)->toMatch('/^[A-Za-z0-9_-]{1,64}$/')
        ->and($call->id)->toStartWith('call_');
});

it('prices the call from the route price table in micro-USD', function () {
    Http::fake([GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(GatewayTestKit::fixture('anthropic_messages', 'text'))]);

    $usage = GatewayTestKit::model()->complete(GatewayTestKit::request())->usage;

    // 120×3 + 30×15 + 1500×0.3 + 400×3.75
    expect($usage->costMicroUsd)->toBe(360 + 450 + 450 + 1500);
});
