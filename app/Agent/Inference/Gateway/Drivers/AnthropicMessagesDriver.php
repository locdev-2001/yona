<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\Inference\Gateway\CachePlan;
use App\Agent\Inference\Gateway\Protocol;
use App\Agent\Inference\Gateway\Route;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\Usage;

// Messages API: system là mảng khối text, công cụ `tool_use` trong tin assistant và
// `tool_result` trong tin user, điểm ngắt cache là `cache_control` trên từng khối.
final class AnthropicMessagesDriver implements ProtocolDriver
{
    private const API_VERSION = '2023-06-01';

    private const PATH = '/v1/messages';

    private const CACHE_CONTROL = ['type' => 'ephemeral'];

    private const TRUNCATED_STOP_REASONS = ['max_tokens', 'model_context_window_exceeded'];

    public function __construct(private readonly CachePlan $cachePlan) {}

    public function protocol(): Protocol
    {
        return Protocol::AnthropicMessages;
    }

    public function endpoint(Route $route): string
    {
        return $route->endpoint(self::PATH);
    }

    public function headers(Route $route): array
    {
        return [
            ...$route->headers,
            'x-api-key' => $route->apiKey,
            'anthropic-version' => self::API_VERSION,
        ];
    }

    public function body(Prompt $prompt, Route $route, string $cacheKey): array
    {
        $cache = $this->cachePlan->directives($prompt, $route, $cacheKey);
        $body = ['model' => $route->model, 'max_tokens' => $route->maxOutputTokens, ...$route->requestOptions];

        if ($prompt->system !== []) {
            $body['system'] = array_map(
                fn (SystemBlock $block, int $index) => $this->textBlock($block->text, $index === $cache->systemBreakpoint),
                $prompt->system,
                array_keys($prompt->system),
            );
        }

        $tools = $this->cachePlan->orderedTools($prompt);

        if ($tools !== []) {
            $body['tools'] = array_map(fn (ToolSpec $tool) => [
                'name' => $tool->name,
                'description' => $tool->description,
                'input_schema' => WireJson::schema($tool->inputSchema),
            ], $tools);
        }

        $body['messages'] = array_map(
            fn (PromptMessage $message, int $index) => $this->message($message, $index === $cache->historyBreakpoint),
            $prompt->messages,
            array_keys($prompt->messages),
        );

        return $body;
    }

    public function parse(array $body): Completion
    {
        $blocks = $body['content'] ?? null;
        $stopReason = $body['stop_reason'] ?? null;

        if (! is_array($blocks) || ! is_string($stopReason)) {
            throw new UnreadableResponse('Messages response lacks `content` or `stop_reason`.');
        }

        $content = [];

        foreach ($blocks as $block) {
            $type = $block['type'] ?? null;

            if ($type === 'text' && is_string($block['text'] ?? null) && $block['text'] !== '') {
                $content[] = new TextBlock($block['text']);
            } elseif ($type === 'tool_use') {
                $content[] = new ToolCall(
                    ToolCallId::normalize((string) ($block['id'] ?? '')),
                    (string) ($block['name'] ?? ''),
                    is_array($block['input'] ?? null) ? $block['input'] : [],
                );
            }
        }

        $nativeReason = match (true) {
            in_array($stopReason, self::TRUNCATED_STOP_REASONS, true) => FinishReason::MaxOutput,
            $stopReason === 'refusal' => FinishReason::Refusal,
            default => FinishReason::EndTurn,
        };

        return Completion::settle($content, $nativeReason, $this->usage((array) ($body['usage'] ?? [])));
    }

    /** @return array<string, mixed> */
    private function message(PromptMessage $message, bool $cacheBreakpoint): array
    {
        $blocks = array_map(fn (TextBlock|ToolCall|ToolResultBlock $block) => match (true) {
            $block instanceof TextBlock => ['type' => 'text', 'text' => $block->text],
            $block instanceof ToolCall => [
                'type' => 'tool_use',
                'id' => ToolCallId::normalize($block->id),
                'name' => $block->name,
                'input' => WireJson::object($block->args),
            ],
            $block instanceof ToolResultBlock => [
                'type' => 'tool_result',
                'tool_use_id' => ToolCallId::normalize($block->toolCallId),
                'content' => $block->content,
                ...($block->isError ? ['is_error' => true] : []),
            ],
        }, MessageBlocks::inWireOrder($message));

        if ($cacheBreakpoint && $blocks !== []) {
            $blocks[array_key_last($blocks)]['cache_control'] = self::CACHE_CONTROL;
        }

        return ['role' => $message->role->value, 'content' => $blocks];
    }

    /** @return array<string, mixed> */
    private function textBlock(string $text, bool $cacheBreakpoint): array
    {
        return ['type' => 'text', 'text' => $text, ...($cacheBreakpoint ? ['cache_control' => self::CACHE_CONTROL] : [])];
    }

    /** @param array<string, mixed> $usage */
    private function usage(array $usage): Usage
    {
        return new Usage(
            inputTokens: max(0, (int) ($usage['input_tokens'] ?? 0)),
            outputTokens: max(0, (int) ($usage['output_tokens'] ?? 0)),
            cacheReadTokens: max(0, (int) ($usage['cache_read_input_tokens'] ?? 0)),
            cacheWriteTokens: max(0, (int) ($usage['cache_creation_input_tokens'] ?? 0)),
        );
    }
}
