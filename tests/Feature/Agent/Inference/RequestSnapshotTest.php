<?php

use App\Agent\ValueObjects\Prompt;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Agent\Inference\GatewayTestKit;

// Bề mặt request khoá bằng snapshot byte: đổi thứ tự khoá, cờ JSON hay vị trí điểm ngắt
// cache đều làm đỏ. Sinh lại có chủ đích: AGENT_UPDATE_SNAPSHOTS=1 rồi soát diff.

const GATEWAY_SNAPSHOT_DIR = __DIR__.'/snapshots';

beforeEach(function () {
    GatewayTestKit::configure();
    GatewayTestKit::useApiCallLog();
    Http::preventStrayRequests();
    Http::fake([
        GatewayTestKit::ANTHROPIC_HOST.'/*' => Http::response(GatewayTestKit::fixture('anthropic_messages', 'text')),
        GatewayTestKit::OPENAI_HOST.'/*' => Http::response(GatewayTestKit::fixture('openai_chat', 'text')),
        GatewayTestKit::OPENROUTER_HOST.'/*' => Http::response(GatewayTestKit::fixture('openai_chat', 'text')),
    ]);
});

function gatewaySentBodies(): array
{
    return Http::recorded()->map(fn (array $pair) => $pair[0]->body())->values()->all();
}

function gatewayRequestBody(string $alias, ?Prompt $prompt = null): string
{
    GatewayTestKit::model()->complete(GatewayTestKit::request(prompt: $prompt, alias: $alias));
    $bodies = gatewaySentBodies();

    return end($bodies);
}

dataset('wire surfaces', [
    'anthropic messages, explicit breakpoints' => ['anthropic_only', 'anthropic_messages.json'],
    'openai chat, automatic cache' => ['openai_only', 'openai_chat_automatic.json'],
    'openrouter anthropic model, passthrough breakpoints' => ['openrouter_only', 'openai_chat_passthrough.json'],
]);

it('matches the byte snapshot of the request body', function (string $alias, string $snapshot) {
    $body = gatewayRequestBody($alias);
    $path = GATEWAY_SNAPSHOT_DIR.'/'.$snapshot;

    if (getenv('AGENT_UPDATE_SNAPSHOTS') === '1') {
        file_put_contents($path, $body."\n");
    }

    expect(file_exists($path))->toBeTrue("Snapshot {$snapshot} is missing; run with AGENT_UPDATE_SNAPSHOTS=1.")
        ->and($body."\n")->toBe(file_get_contents($path));
})->with('wire surfaces');

it('keeps the request prefix byte-identical across two turns of the same AI agent', function (string $alias) {
    $first = gatewayRequestBody($alias, GatewayTestKit::turnPrompt());
    $second = gatewayRequestBody($alias, GatewayTestKit::nextTurnPrompt());

    // Tới điểm ngắt lịch sử của lượt đầu (tin assistant thứ 2), byte phải trùng hệt.
    $breakpointAt = strpos($first, 'Để em kiểm tra.');
    expect($breakpointAt)->toBeInt()
        ->and(substr($second, 0, $breakpointAt))->toBe(substr($first, 0, $breakpointAt));

    // Bỏ dấu điểm ngắt (chỉ dời chỗ giữa hai lượt) thì cả lịch sử lượt đầu là tiền tố.
    $unmarked = fn (string $body) => str_replace([',"cache_control":{"type":"ephemeral"}'], '', $body);
    $firstHistory = substr($unmarked($first), 0, strrpos($unmarked($first), ']}'));

    expect(str_starts_with($unmarked($second), $firstHistory))->toBeTrue();
})->with(['anthropic_only', 'openai_only', 'openrouter_only']);

it('places breakpoints only where the provider honours them', function () {
    expect(substr_count(gatewayRequestBody('anthropic_only'), 'cache_control'))->toBe(2)
        ->and(substr_count(gatewayRequestBody('openrouter_only'), 'cache_control'))->toBe(2)
        ->and(gatewayRequestBody('openai_only'))->not->toContain('cache_control');
});

it('sends prompt_cache_key only to providers with automatic routing caches', function () {
    expect(json_decode(gatewayRequestBody('openai_only'), true)['prompt_cache_key'])->toBe(GatewayTestKit::CACHE_KEY)
        ->and(json_decode(gatewayRequestBody('openrouter_only'), true)['prompt_cache_key'])->toBe(GatewayTestKit::CACHE_KEY)
        ->and(json_decode(gatewayRequestBody('anthropic_only'), true))->not->toHaveKey('prompt_cache_key');
});

it('authenticates through headers and never puts the key in the logged body', function () {
    $log = GatewayTestKit::useApiCallLog();
    GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'anthropic_only'));
    GatewayTestKit::model()->complete(GatewayTestKit::request(alias: 'openrouter_only'));

    Http::assertSent(fn (Request $request) => $request->hasHeader('x-api-key', GatewayTestKit::ANTHROPIC_KEY)
        && $request->hasHeader('anthropic-version', '2023-06-01'));
    Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer '.GatewayTestKit::OPENROUTER_KEY)
        && $request->hasHeader('X-OpenRouter-Title', 'Yona'));

    $logged = json_encode(array_map(fn ($record) => [$record->request, $record->response], $log->records));
    expect($logged)->not->toContain(GatewayTestKit::ANTHROPIC_KEY)
        ->and($logged)->not->toContain(GatewayTestKit::OPENROUTER_KEY);
});

it('never forces a tool and renders empty objects as JSON objects', function () {
    $anthropic = gatewayRequestBody('anthropic_only');
    $openai = gatewayRequestBody('openai_only');

    expect($anthropic)->not->toContain('tool_choice')
        ->and($openai)->not->toContain('tool_choice')
        ->and($anthropic)->toContain('"input_schema":{"properties":{},"type":"object"}')
        ->and($openai)->toContain('"parameters":{"properties":{},"type":"object"}');
});
