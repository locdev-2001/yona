<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\Inference\Gateway\CacheDirectives;
use App\Agent\Inference\Gateway\CachePlan;
use App\Agent\Inference\Gateway\Protocol;
use App\Agent\Inference\Gateway\Route;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\ProviderBlock;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\Usage;

// Chat Completions (OpenAI, OpenRouter, mọi API tương thích): lời gọi công cụ ở
// `tool_calls[].function.arguments` (chuỗi JSON), mỗi kết quả là một tin role `tool`.
final class OpenAiChatDriver implements ProtocolDriver
{
    private const PATH = '/chat/completions';

    private const CACHE_CONTROL = ['type' => 'ephemeral'];

    private const TRUNCATED_FINISH_REASONS = ['length'];

    private const REFUSAL_FINISH_REASONS = ['content_filter'];

    // Khối suy luận của cổng trung gian nằm ở trường riêng của message, không trong content.
    private const REASONING_DETAILS = 'reasoning_details';

    // Mã lỗi trong thân 2xx không phải mã HTTP thì coi như cổng trung gian hỏng.
    private const FALLBACK_ERROR_STATUS = 502;

    public function __construct(private readonly CachePlan $cachePlan) {}

    public function protocol(): Protocol
    {
        return Protocol::OpenAiChat;
    }

    public function endpoint(Route $route): string
    {
        return $route->endpoint(self::PATH);
    }

    public function headers(Route $route): array
    {
        return [...$route->headers, 'Authorization' => 'Bearer '.$route->apiKey];
    }

    public function body(Prompt $prompt, Route $route, string $cacheKey): array
    {
        $cache = $this->cachePlan->directives($prompt, $route, $cacheKey);
        $body = ['model' => $route->model, $route->maxTokensField => $route->maxOutputTokens, ...$route->requestOptions];

        if ($cache->promptCacheKey !== null) {
            $body['prompt_cache_key'] = $cache->promptCacheKey;
        }

        $tools = $this->cachePlan->orderedTools($prompt);

        if ($tools !== []) {
            $body['tools'] = array_map(fn (ToolSpec $tool) => [
                'type' => 'function',
                'function' => [
                    'name' => $tool->name,
                    'description' => $tool->description,
                    'parameters' => WireJson::schema($tool->inputSchema),
                ],
            ], $tools);
        }

        $messages = [];

        if ($prompt->system !== []) {
            $messages[] = ['role' => 'system', 'content' => array_map(
                fn (SystemBlock $block, int $index) => $this->textPart($block->text, $index === $cache->systemBreakpoint),
                $prompt->system,
                array_keys($prompt->system),
            )];
        }

        foreach ($prompt->messages as $index => $message) {
            array_push($messages, ...$this->messages($message, $route, $cache, $index === $cache->historyBreakpoint));
        }

        // `messages` đứng cuối để lượt sau nối thêm mà không đổi byte phía trước.
        $body['messages'] = $messages;

        return $body;
    }

    public function parse(array $body, Route $route): Completion
    {
        if (isset($body['error'])) {
            $code = is_array($body['error']) ? ($body['error']['code'] ?? null) : null;

            throw new ProviderErrorInBody(is_int($code) && $code >= 400 && $code < 600 ? $code : self::FALLBACK_ERROR_STATUS, $body);
        }

        $choice = $body['choices'][0] ?? null;

        if (! is_array($choice) || ! is_array($choice['message'] ?? null)) {
            throw new UnreadableResponse('Chat completion lacks `choices[0].message`.');
        }

        $finishReason = $choice['finish_reason'] ?? null;

        if ($finishReason === 'error') {
            throw new ProviderErrorInBody(self::FALLBACK_ERROR_STATUS, $body);
        }

        $message = $choice['message'];
        $truncated = in_array($finishReason, self::TRUNCATED_FINISH_REASONS, true);
        $refusal = is_string($message['refusal'] ?? null) && trim($message['refusal']) !== '' ? $message['refusal'] : null;
        $text = $this->messageText($message['content'] ?? null);
        $content = [];
        $reasoningDetails = $message[self::REASONING_DETAILS] ?? null;

        if (is_array($reasoningDetails) && $reasoningDetails !== []) {
            $content[] = new ProviderBlock(self::REASONING_DETAILS, $route->identity(), [self::REASONING_DETAILS => $reasoningDetails]);
        }

        if ($text !== '' || $refusal !== null) {
            $content[] = new TextBlock($text !== '' ? $text : (string) $refusal);
        }

        foreach ((array) ($message['tool_calls'] ?? []) as $call) {
            $toolCall = $this->toolCall((array) $call, $truncated);

            if ($toolCall !== null) {
                $content[] = $toolCall;
            }
        }

        $nativeReason = match (true) {
            $refusal !== null, in_array($finishReason, self::REFUSAL_FINISH_REASONS, true) => FinishReason::Refusal,
            $truncated => FinishReason::MaxOutput,
            default => FinishReason::EndTurn,
        };

        return Completion::settle($content, $nativeReason, $this->usage((array) ($body['usage'] ?? [])));
    }

    /** @return list<array<string, mixed>> một tin Prompt có thể thành nhiều tin wire */
    private function messages(PromptMessage $message, Route $route, CacheDirectives $cache, bool $cacheBreakpoint): array
    {
        $blocks = MessageBlocks::inWireOrder($message);
        $explicitCache = $cache->usesBreakpoints();

        $wire = $message->role === MessageRole::Assistant
            ? [$this->assistantMessage($blocks, $route, $explicitCache)]
            : $this->userMessages($blocks, $explicitCache);

        return $cacheBreakpoint ? $this->markLastPart($wire) : $wire;
    }

    /**
     * Khi dùng điểm ngắt tường minh, chữ luôn ở dạng mảng phần để điểm ngắt đặt được mà
     * không đổi byte của tin giữa hai lượt. Khối suy luận cùng tuyến gắn lại nguyên văn
     * vào trường riêng; của tuyến khác thì bỏ.
     *
     * @param  list<TextBlock|ToolCall|ToolResultBlock|ProviderBlock>  $blocks
     * @return array<string, mixed>
     */
    private function assistantMessage(array $blocks, Route $route, bool $explicitCache): array
    {
        $texts = array_values(array_map(fn (TextBlock $block) => $block->text, array_filter($blocks, fn ($block) => $block instanceof TextBlock)));
        $calls = array_values(array_filter($blocks, fn ($block) => $block instanceof ToolCall));
        $content = match (true) {
            $texts === [] => null,
            $explicitCache => array_map(fn (string $text) => $this->textPart($text, false), $texts),
            default => implode("\n\n", $texts),
        };
        $wire = ['role' => 'assistant', 'content' => $content];

        if ($calls !== []) {
            $wire['tool_calls'] = array_map(fn (ToolCall $call) => [
                'id' => ToolCallId::normalize($call->id),
                'type' => 'function',
                'function' => ['name' => $call->name, 'arguments' => WireJson::encode(WireJson::object($call->args))],
            ], $calls);
        }

        foreach ($blocks as $block) {
            if ($block instanceof ProviderBlock && $block->kind === self::REASONING_DETAILS && $block->belongsTo($route->identity())) {
                $wire[self::REASONING_DETAILS] = $block->payload[self::REASONING_DETAILS];
            }
        }

        return $wire;
    }

    /**
     * Mỗi kết quả công cụ một tin `tool`, chữ còn lại gom thành một tin `user` theo sau.
     * Khi dùng điểm ngắt tường minh, nội dung tin `tool` cũng ở dạng mảng phần.
     *
     * @param  list<TextBlock|ToolCall|ToolResultBlock|ProviderBlock>  $blocks
     * @return list<array<string, mixed>>
     */
    private function userMessages(array $blocks, bool $explicitCache): array
    {
        $wire = [];
        $textParts = [];

        foreach ($blocks as $block) {
            if ($block instanceof ToolResultBlock) {
                $wire[] = [
                    'role' => 'tool',
                    'tool_call_id' => ToolCallId::normalize($block->toolCallId),
                    'content' => $explicitCache ? [$this->textPart($block->content, false)] : $block->content,
                ];
            } elseif ($block instanceof TextBlock) {
                $textParts[] = $this->textPart($block->text, false);
            }
        }

        if ($textParts !== []) {
            $wire[] = ['role' => 'user', 'content' => $textParts];
        }

        return $wire;
    }

    /**
     * Đặt `cache_control` lên phần nội dung cuối của nhóm tin wire. Tin assistant chỉ có
     * lời gọi công cụ thì không có phần nào mang được điểm ngắt, nên bỏ qua.
     *
     * @param  list<array<string, mixed>>  $wire
     * @return list<array<string, mixed>>
     */
    private function markLastPart(array $wire): array
    {
        $last = array_key_last($wire);

        if ($last === null) {
            return $wire;
        }

        $content = $wire[$last]['content'];

        if (! is_array($content) || $content === []) {
            return $wire;
        }

        $content[array_key_last($content)]['cache_control'] = self::CACHE_CONTROL;
        $wire[$last]['content'] = $content;

        return $wire;
    }

    /** @return array<string, mixed> */
    private function textPart(string $text, bool $cacheBreakpoint): array
    {
        return ['type' => 'text', 'text' => $text, ...($cacheBreakpoint ? ['cache_control' => self::CACHE_CONTROL] : [])];
    }

    private function messageText(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }

        if (! is_array($content)) {
            return '';
        }

        $texts = array_map(
            fn ($part) => is_array($part) && is_string($part['text'] ?? null) ? $part['text'] : '',
            $content,
        );

        return implode('', $texts);
    }

    /** @param array<string, mixed> $call */
    private function toolCall(array $call, bool $truncated): ?ToolCall
    {
        $function = (array) ($call['function'] ?? []);
        $arguments = $function['arguments'] ?? '';
        $args = $arguments === '' || $arguments === null ? [] : json_decode((string) $arguments, true);

        if (! is_array($args)) {
            if ($truncated) {
                return null;
            }

            throw new UnreadableResponse('Tool call arguments are not a JSON object.');
        }

        return new ToolCall(
            ToolCallId::normalize((string) ($call['id'] ?? '')),
            (string) ($function['name'] ?? ''),
            $args,
        );
    }

    /**
     * `prompt_tokens` đã gồm phần đọc từ cache (và phần ghi cache ở cổng trung gian); chuẩn
     * trung tính: inputTokens chỉ là phần không qua cache, như Messages API.
     *
     * @param  array<string, mixed>  $usage
     */
    private function usage(array $usage): Usage
    {
        $details = (array) ($usage['prompt_tokens_details'] ?? []);
        $cacheRead = max(0, (int) ($details['cached_tokens'] ?? 0));
        $cacheWrite = max(0, (int) ($details['cache_write_tokens'] ?? 0));

        return new Usage(
            inputTokens: max(0, (int) ($usage['prompt_tokens'] ?? 0) - $cacheRead - $cacheWrite),
            outputTokens: max(0, (int) ($usage['completion_tokens'] ?? 0)),
            cacheReadTokens: $cacheRead,
            cacheWriteTokens: $cacheWrite,
        );
    }
}
