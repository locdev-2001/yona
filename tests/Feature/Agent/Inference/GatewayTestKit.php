<?php

namespace Tests\Feature\Agent\Inference;

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\Contracts\Ports\LanguageModel;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelRequest;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\SystemBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\ToolSpec;
use DateTimeImmutable;
use Illuminate\Support\Carbon;

// Dựng config, prompt và request dùng chung cho test cổng mô hình. Mọi base_url trỏ về
// tên miền .test để lời gọi lọt Http::fake không bao giờ ra mạng thật.
final class GatewayTestKit
{
    public const ANTHROPIC_HOST = 'anthropic.test';

    public const OPENAI_HOST = 'openai.test';

    public const OPENROUTER_HOST = 'openrouter.test';

    public const ANTHROPIC_KEY = 'sk-ant-test-secret';

    public const OPENROUTER_KEY = 'sk-or-test-secret';

    public const OPENAI_KEY = 'sk-openai-test-secret';

    public const ACCOUNT_ID = 11;

    public const CONVERSATION_ID = 22;

    public const AI_AGENT_ID = 5;

    public const CACHE_KEY = 'ai-agent-5';

    public static function configure(array $agentModels = []): void
    {
        config([
            'agent.providers' => [
                'anthropic' => [
                    'protocol' => 'anthropic_messages',
                    'base_url' => 'https://'.self::ANTHROPIC_HOST,
                    'api_key' => self::ANTHROPIC_KEY,
                    'cache' => 'explicit',
                ],
                'openai' => [
                    'protocol' => 'openai_chat',
                    'base_url' => 'https://'.self::OPENAI_HOST.'/v1',
                    'api_key' => self::OPENAI_KEY,
                    'cache' => 'automatic',
                    'max_tokens_field' => 'max_completion_tokens',
                ],
                'openrouter' => [
                    'protocol' => 'openai_chat',
                    'base_url' => 'https://'.self::OPENROUTER_HOST.'/api/v1',
                    'api_key' => self::OPENROUTER_KEY,
                    'cache' => 'passthrough',
                    'max_tokens_field' => 'max_tokens',
                    'headers' => ['HTTP-Referer' => 'https://yona.test', 'X-OpenRouter-Title' => 'Yona'],
                ],
            ],
            'agent.models' => [
                'main' => ['routes' => [
                    ['provider' => 'anthropic', 'model' => 'claude-test', 'max_output' => 1024, 'price' => ['input' => 3, 'output' => 15, 'cache_read' => 0.3, 'cache_write' => 3.75]],
                    ['provider' => 'openrouter', 'model' => 'anthropic/claude-test', 'max_output' => 1024, 'price' => ['input' => 3, 'output' => 15, 'cache_read' => 0.3, 'cache_write' => 3.75]],
                ]],
                'anthropic_only' => ['routes' => [
                    ['provider' => 'anthropic', 'model' => 'claude-test', 'max_output' => 1024],
                ]],
                'openai_only' => ['routes' => [
                    ['provider' => 'openai', 'model' => 'gpt-test', 'max_output' => 1024],
                ]],
                'openrouter_only' => ['routes' => [
                    ['provider' => 'openrouter', 'model' => 'anthropic/claude-test', 'max_output' => 1024],
                ]],
            ],
            'agent.default_model' => 'main',
            'agent.agent_models' => $agentModels,
        ]);
    }

    public static function useApiCallLog(RecordingApiCallLog $log = new RecordingApiCallLog): RecordingApiCallLog
    {
        app()->instance(ApiCallLog::class, $log);

        return $log;
    }

    public static function model(): LanguageModel
    {
        return app(LanguageModel::class);
    }

    public static function request(
        ?Prompt $prompt = null,
        ?string $alias = null,
        ?int $aiAgentId = self::AI_AGENT_ID,
        int $deadlineSeconds = 60,
    ): ModelRequest {
        return new ModelRequest(
            accountId: self::ACCOUNT_ID,
            prompt: $prompt ?? self::turnPrompt(),
            deadline: DateTimeImmutable::createFromInterface(Carbon::now())->modify("+{$deadlineSeconds} seconds"),
            cacheKey: self::CACHE_KEY,
            modelAlias: $alias,
            aiAgentId: $aiAgentId,
            conversationId: self::CONVERSATION_ID,
        );
    }

    /** @return list<ToolSpec> cố ý không theo thứ tự tên */
    public static function tools(): array
    {
        return [
            new ToolSpec('search_knowledge', 'Search the shop help center.', [
                'type' => 'object',
                'required' => ['query'],
                'properties' => ['query' => ['type' => 'string', 'description' => 'What to look up.']],
            ], ToolKind::Read),
            new ToolSpec('reply', 'Send the reply to the customer.', [
                'type' => 'object',
                'properties' => ['text' => ['type' => 'string']],
                'required' => ['text'],
            ], ToolKind::Terminal),
            new ToolSpec('wait_for_customer', 'End the turn without replying.', ['type' => 'object', 'properties' => []], ToolKind::Terminal),
        ];
    }

    /** @return list<SystemBlock> */
    public static function system(): array
    {
        return [
            new SystemBlock('Platform policy: never invent prices.'),
            new SystemBlock('Shop "Áo Đẹp": xưng em, gọi khách là anh/chị.'),
        ];
    }

    /**
     * Lượt đầu: khách hỏi, AI đã tra một lần, khối bối cảnh của lượt ở cuối tin cuối.
     * Điểm ngắt lịch sử đặt ở tin assistant (item cuối trước khối bối cảnh).
     */
    public static function turnPrompt(): Prompt
    {
        return new Prompt(self::system(), self::tools(), self::firstTurnMessages(), historyCacheBreakpoint: 1);
    }

    // Lượt kế tiếp của cùng hội thoại: lịch sử lượt trước giữ nguyên, nối thêm phía sau.
    public static function nextTurnPrompt(): Prompt
    {
        $messages = [
            ...self::firstTurnMessages(),
            new PromptMessage(MessageRole::Assistant, [new ToolCall('toolu_02', 'reply', ['text' => 'Dạ size M còn ạ.'])]),
            new PromptMessage(MessageRole::User, [
                new ToolResultBlock('toolu_02', '{"ok":true}'),
                new TextBlock('Khách: Ship về Đà Nẵng mất mấy ngày?'),
                new TextBlock('Now: Thu 15/10/2026 09:05 (Asia/Ho_Chi_Minh)'),
            ]),
        ];

        return new Prompt(self::system(), self::tools(), $messages, historyCacheBreakpoint: 3);
    }

    /** @return array<string, mixed> */
    public static function fixture(string $protocol, string $scenario): array
    {
        return json_decode((string) file_get_contents(__DIR__."/fixtures/{$protocol}/{$scenario}.json"), true, flags: JSON_THROW_ON_ERROR);
    }

    /** @return list<PromptMessage> */
    private static function firstTurnMessages(): array
    {
        return [
            new PromptMessage(MessageRole::User, [new TextBlock('Áo thun trắng còn size M không shop?')]),
            new PromptMessage(MessageRole::Assistant, [
                new TextBlock('Để em kiểm tra.'),
                new ToolCall('toolu_01', 'search_knowledge', ['query' => 'áo thun trắng size M']),
            ]),
            new PromptMessage(MessageRole::User, [
                new TextBlock('Now: Thu 15/10/2026 09:00 (Asia/Ho_Chi_Minh)'),
                new ToolResultBlock('toolu_01', '{"ok":true,"data":{"hits":[]}}'),
            ]),
        ];
    }
}
