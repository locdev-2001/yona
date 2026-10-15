<?php

namespace App\Services\Admin\AiLogs;

use App\Models\ApiLog;

// Đọc một dòng `api_logs` cho Super Admin › Nhật ký AI: lời gọi công cụ, lý do dừng của
// mô hình, lệnh cURL để chạy lại. Thân request/response là JSON thô của nhà cung cấp theo
// giao thức khai ở config/agent.php (`anthropic_messages` hoặc `openai_chat`); hai giao
// thức có cấu trúc khác nhau nên đọc theo giao thức, không theo tên nhà cung cấp.
final class ApiLogInspector
{
    // Đường dẫn của từng giao thức, nối sau `base_url` của nhà cung cấp. Phải khớp
    // đường dẫn các driver ở App\Agent\Inference\Gateway\Drivers đang gọi.
    private const PROTOCOL_PATHS = [
        'anthropic_messages' => '/v1/messages',
        'openai_chat' => '/chat/completions',
    ];

    // Header khoá của từng giao thức: chỉ hiện tên header, không bao giờ hiện khoá.
    private const PROTOCOL_KEY_HEADERS = [
        'anthropic_messages' => ['x-api-key: <API_KEY>', 'anthropic-version: 2023-06-01'],
        'openai_chat' => ['Authorization: Bearer <API_KEY>'],
    ];

    private const KEY_PLACEHOLDER = '<API_KEY>';

    public function protocol(string $provider): ?string
    {
        $protocol = config("agent.providers.{$provider}.protocol");

        return is_string($protocol) && array_key_exists($protocol, self::PROTOCOL_PATHS) ? $protocol : null;
    }

    public function endpoint(string $provider): ?string
    {
        $protocol = $this->protocol($provider);
        $baseUrl = config("agent.providers.{$provider}.base_url");

        if ($protocol === null || ! is_string($baseUrl) || $baseUrl === '') {
            return null;
        }

        return rtrim($baseUrl, '/').self::PROTOCOL_PATHS[$protocol];
    }

    // Lý do dừng nhà cung cấp trả về (stop_reason / finish_reason), null khi lỗi.
    public function finishReason(ApiLog $log): ?string
    {
        $response = $log->response ?? [];

        $reason = match ($this->protocol($log->provider)) {
            'anthropic_messages' => $response['stop_reason'] ?? null,
            'openai_chat' => $response['choices'][0]['finish_reason'] ?? null,
            default => $response['stop_reason'] ?? $response['choices'][0]['finish_reason'] ?? null,
        };

        return is_string($reason) ? $reason : null;
    }

    /**
     * Lời gọi công cụ trong lượt: lấy từ lịch sử của request (các bước trước, đã có kết
     * quả) cộng lời gọi mới trong response (chưa có kết quả).
     *
     * @return list<array{id: string, name: string, input: mixed, output: mixed, is_error: bool, pending: bool}>
     */
    public function toolCalls(ApiLog $log): array
    {
        $protocol = $this->protocol($log->provider) ?? 'openai_chat';
        $request = $log->request ?? [];
        $response = $log->response ?? [];

        [$calls, $results] = $protocol === 'anthropic_messages'
            ? $this->anthropicHistory($request['messages'] ?? [])
            : $this->openAiHistory($request['messages'] ?? []);

        $pending = $protocol === 'anthropic_messages'
            ? $this->anthropicCalls($response['content'] ?? [])
            : $this->openAiCalls($response['choices'][0]['message']['tool_calls'] ?? []);

        $rows = [];

        foreach ($calls as $call) {
            $result = $results[$call['id']] ?? null;
            $rows[] = [...$call, 'output' => $result['content'] ?? null, 'is_error' => $result['is_error'] ?? false, 'pending' => false];
        }

        foreach ($pending as $call) {
            $rows[] = [...$call, 'output' => null, 'is_error' => false, 'pending' => true];
        }

        return $rows;
    }

    // Lệnh cURL chạy lại đúng request này; khoá thay bằng chỗ trống để người chạy tự điền.
    public function curl(ApiLog $log): ?string
    {
        $endpoint = $this->endpoint($log->provider);
        $protocol = $this->protocol($log->provider);

        if ($endpoint === null || $protocol === null) {
            return null;
        }

        $headers = [
            'Content-Type: application/json',
            ...self::PROTOCOL_KEY_HEADERS[$protocol],
            ...$this->extraHeaders($log->provider),
        ];

        $lines = ["curl -X POST '{$endpoint}'"];

        foreach ($headers as $header) {
            $lines[] = '  -H '.$this->shellQuote($header);
        }

        $lines[] = '  -d '.$this->shellQuote((string) json_encode($log->request ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return implode(" \\\n", $lines);
    }

    /** @return list<string> header phụ khai trong config (không phải khoá) */
    private function extraHeaders(string $provider): array
    {
        $headers = config("agent.providers.{$provider}.headers", []);

        if (! is_array($headers)) {
            return [];
        }

        $lines = [];

        foreach ($headers as $name => $value) {
            if (is_string($name) && is_scalar($value) && ! $this->looksSecret($name)) {
                $lines[] = "{$name}: {$value}";
            }
        }

        return $lines;
    }

    private function looksSecret(string $headerName): bool
    {
        $name = strtolower($headerName);

        return str_contains($name, 'key') || str_contains($name, 'auth') || str_contains($name, 'token');
    }

    private function shellQuote(string $value): string
    {
        return "'".str_replace("'", "'\\''", $value)."'";
    }

    /**
     * @return array{0: list<array{id: string, name: string, input: mixed}>, 1: array<string, array{content: mixed, is_error: bool}>}
     */
    private function anthropicHistory(mixed $messages): array
    {
        $calls = [];
        $results = [];

        foreach (is_array($messages) ? $messages : [] as $message) {
            $blocks = is_array($message['content'] ?? null) ? $message['content'] : [];

            if (($message['role'] ?? null) === 'assistant') {
                array_push($calls, ...$this->anthropicCalls($blocks));

                continue;
            }

            foreach ($blocks as $block) {
                if (($block['type'] ?? null) === 'tool_result' && is_string($block['tool_use_id'] ?? null)) {
                    $results[$block['tool_use_id']] = [
                        'content' => $this->decodeJson($block['content'] ?? null),
                        'is_error' => (bool) ($block['is_error'] ?? false),
                    ];
                }
            }
        }

        return [$calls, $results];
    }

    /** @return list<array{id: string, name: string, input: mixed}> */
    private function anthropicCalls(mixed $blocks): array
    {
        $calls = [];

        foreach (is_array($blocks) ? $blocks : [] as $block) {
            if (($block['type'] ?? null) === 'tool_use') {
                $calls[] = ['id' => (string) ($block['id'] ?? ''), 'name' => (string) ($block['name'] ?? ''), 'input' => $block['input'] ?? null];
            }
        }

        return $calls;
    }

    /**
     * @return array{0: list<array{id: string, name: string, input: mixed}>, 1: array<string, array{content: mixed, is_error: bool}>}
     */
    private function openAiHistory(mixed $messages): array
    {
        $calls = [];
        $results = [];

        foreach (is_array($messages) ? $messages : [] as $message) {
            $role = $message['role'] ?? null;

            if ($role === 'assistant') {
                array_push($calls, ...$this->openAiCalls($message['tool_calls'] ?? []));
            } elseif ($role === 'tool' && is_string($message['tool_call_id'] ?? null)) {
                $results[$message['tool_call_id']] = ['content' => $this->decodeJson($message['content'] ?? null), 'is_error' => false];
            }
        }

        return [$calls, $results];
    }

    /** @return list<array{id: string, name: string, input: mixed}> */
    private function openAiCalls(mixed $toolCalls): array
    {
        $calls = [];

        foreach (is_array($toolCalls) ? $toolCalls : [] as $call) {
            $calls[] = [
                'id' => (string) ($call['id'] ?? ''),
                'name' => (string) ($call['function']['name'] ?? ''),
                'input' => $this->decodeJson($call['function']['arguments'] ?? null),
            ];
        }

        return $calls;
    }

    // Kết quả và tham số công cụ thường là chuỗi JSON: giải ra để hiện có cấu trúc.
    private function decodeJson(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }
}
