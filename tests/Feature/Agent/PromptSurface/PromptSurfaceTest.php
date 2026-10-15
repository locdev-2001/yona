<?php

use App\Agent\Context\History;
use App\Agent\Context\PromptAssembly;
use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\Tools\Runner\Registry;
use App\Agent\ValueObjects\AiAgentProfile;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\TurnSituation;

// Bề mặt prompt khoá bằng snapshot: đổi luật nền tảng, mô tả công cụ, nhãn lịch sử hay
// thứ tự khối đều làm đỏ. Sinh lại có chủ đích: AGENT_UPDATE_SNAPSHOTS=1 rồi soát diff.

const PROMPT_SURFACE_SNAPSHOT = __DIR__.'/snapshots/turn_prompt.json';

beforeEach(function () {
    app()->instance(KnowledgeReader::class, new class implements KnowledgeReader
    {
        public function search(int $accountId, string $query, int $limit): array
        {
            return [];
        }
    });
});

/** @return list<CoreMessage> */
function surfaceMessages(): array
{
    $at = new DateTimeImmutable('2026-10-15 08:00:00');

    return [
        new CoreMessage(1, MessageOrigin::AiAgent, 'Dạ em chào anh, shop có thể giúp gì ạ?', false, $at, senderAiAgentId: 7, senderName: 'Lan'),
        new CoreMessage(2, MessageOrigin::Customer, 'Áo thun trắng còn size M không?', false, $at),
        new CoreMessage(3, MessageOrigin::Customer, null, false, $at, attachmentTypes: ['image']),
        new CoreMessage(4, MessageOrigin::AiAgent, 'Dạ còn ạ.', false, $at, senderAiAgentId: 7, senderName: 'Lan'),
        new CoreMessage(5, MessageOrigin::Staff, 'Ghi chú nội bộ: khách quen.', true, $at, senderUserId: 3, senderName: 'Minh'),
        new CoreMessage(6, MessageOrigin::Staff, 'Dạ mẫu này còn màu đen nữa anh nhé.', false, $at, senderUserId: 3, senderName: 'Minh'),
        new CoreMessage(7, MessageOrigin::System, 'Lan đã bật trả lời tự động', false, $at),
        new CoreMessage(8, MessageOrigin::ChannelEcho, 'Anh cần gì cứ nhắn nhé.', false, $at),
        new CoreMessage(9, MessageOrigin::Automation, 'Cảm ơn anh đã liên hệ.', false, $at),
        new CoreMessage(10, MessageOrigin::Customer, 'Giá bao nhiêu vậy?', false, $at),
    ];
}

function surfacePrompt(): Prompt
{
    $history = (new History)->render(surfaceMessages(), 12000, 10);

    return (new PromptAssembly)->build(
        new AiAgentProfile(7, 'Lan', 'Xưng em, gọi khách là anh/chị.', 'Shop Áo Đẹp bán áo thun nam nữ.'),
        app(Registry::class)->specs(),
        $history,
        new TurnSituation(new DateTimeImmutable('2026-10-15 02:05:00 UTC'), 'Asia/Ho_Chi_Minh', 'zalo', true),
        [
            new PromptMessage(MessageRole::Assistant, [new ToolCall('call_1', 'search_knowledge', ['query' => 'giá áo thun'])]),
            new PromptMessage(MessageRole::User, [new ToolResultBlock('call_1', '{"ok":true,"data":[]}')]),
        ],
    );
}

/** @return array<string, mixed> */
function readableSurface(Prompt $prompt): array
{
    $block = fn ($block) => match (true) {
        $block instanceof TextBlock => ['text' => $block->text],
        $block instanceof ToolCall => ['tool_call' => [$block->name, $block->args]],
        $block instanceof ToolResultBlock => ['tool_result' => $block->content],
    };

    return [
        'system' => array_map(fn ($system) => $system->text, $prompt->system),
        'tools' => array_map(fn ($tool) => ['name' => $tool->name, 'kind' => $tool->kind->value, 'description' => $tool->description, 'schema' => $tool->inputSchema], $prompt->tools),
        'messages' => array_map(fn (PromptMessage $message) => ['role' => $message->role->value, 'content' => array_map($block, $message->content)], $prompt->messages),
        'history_cache_breakpoint' => $prompt->historyCacheBreakpoint,
    ];
}

it('keeps the turn prompt surface stable', function () {
    $surface = json_encode(readableSurface(surfacePrompt()), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n";

    if (getenv('AGENT_UPDATE_SNAPSHOTS') === '1') {
        @mkdir(dirname(PROMPT_SURFACE_SNAPSHOT), recursive: true);
        file_put_contents(PROMPT_SURFACE_SNAPSHOT, $surface);
    }

    expect($surface)->toBe(file_get_contents(PROMPT_SURFACE_SNAPSHOT));
});

it('labels who spoke, keeps private notes out and starts with the customer', function () {
    $messages = surfacePrompt()->messages;
    $texts = [];

    foreach ($messages as $message) {
        foreach ($message->content as $block) {
            if ($block instanceof TextBlock) {
                $texts[] = [$message->role, $block->text];
            }
        }
    }

    expect($messages[0]->role)->toBe(MessageRole::User)
        ->and($texts)->toContain([MessageRole::User, '[customer] Áo thun trắng còn size M không?'])
        ->and($texts)->toContain([MessageRole::User, '[customer] [sent: image]'])
        ->and($texts)->toContain([MessageRole::Assistant, 'Dạ còn ạ.'])
        ->and($texts)->toContain([MessageRole::User, '[staff: Minh] Dạ mẫu này còn màu đen nữa anh nhé.'])
        ->and($texts)->toContain([MessageRole::User, '[shop owner via the channel app] Anh cần gì cứ nhắn nhé.'])
        ->and($texts)->toContain([MessageRole::User, '[automated message] Cảm ơn anh đã liên hệ.'])
        ->and($texts)->toContain([MessageRole::User, '[event] Lan đã bật trả lời tự động'])
        ->and(json_encode($texts, JSON_UNESCAPED_UNICODE))->not->toContain('Ghi chú nội bộ');
});

it('puts the history cache breakpoint on the last history message, before the turn context', function () {
    $prompt = surfacePrompt();
    $breakpoint = $prompt->historyCacheBreakpoint;

    expect($prompt->messages[$breakpoint + 1]->content[0]->text)->toStartWith('[turn context] Local time: Thursday 15/10/2026 09:05 (Asia/Ho_Chi_Minh). Channel: zalo.')
        ->and(array_slice($prompt->messages[$breakpoint]->content, -1)[0]->text)->toBe('[customer] Giá bao nhiêu vậy?');
});

it('renders the same history bytes on the next turn so the cached prefix still matches', function () {
    $history = new History;
    $first = $history->render(surfaceMessages(), 12000, 10);
    $next = $history->render([
        ...surfaceMessages(),
        new CoreMessage(11, MessageOrigin::AiAgent, 'Dạ áo giá 150k ạ.', false, new DateTimeImmutable, senderAiAgentId: 7),
        new CoreMessage(12, MessageOrigin::Customer, 'Ok lấy 1 cái', false, new DateTimeImmutable),
    ], 12000, 10);

    expect(array_slice($next, 0, count($first)))->toEqual($first);
});

it('drops the oldest messages in chunks under the token cap but never the newest one', function () {
    $history = new History;
    $long = array_map(fn (int $id) => new CoreMessage($id, $id % 2 ? MessageOrigin::Customer : MessageOrigin::AiAgent, str_repeat('chữ ', 100), false, new DateTimeImmutable), range(1, 29));

    $rendered = $history->render($long, 1000, 10);
    $onlyNewest = $history->render($long, 1, 10);

    expect($rendered[0]->role)->toBe(MessageRole::User)
        ->and(count($rendered))->toBeLessThan(29)
        ->and($onlyNewest)->toHaveCount(1)
        ->and($onlyNewest[0]->role)->toBe(MessageRole::User);
});

it('opens with a marker when the shop spoke first, so the greeting is kept', function () {
    $rendered = (new History)->render(surfaceMessages(), 12000, 10);

    expect($rendered[0]->content[0]->text)->toBe('[event] Conversation history starts here.')
        ->and($rendered[1]->role)->toBe(MessageRole::Assistant)
        ->and($rendered[1]->content[0]->text)->toBe('Dạ em chào anh, shop có thể giúp gì ạ?');
});
