<?php

use App\Agent\ValueObjects\AutonomyLevel;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\DeliveryFailure;
use App\Agent\ValueObjects\DeliveryReceipt;
use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelErrorKind;
use App\Agent\ValueObjects\ModelResponse;
use App\Agent\ValueObjects\Prompt;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\Stimulus;
use App\Agent\ValueObjects\StimulusDecision;
use App\Agent\ValueObjects\StimulusDecisionKind;
use App\Agent\ValueObjects\StimulusKind;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;
use App\Agent\ValueObjects\Usage;

const OBJECT_SCHEMA = ['type' => 'object', 'properties' => []];

function userMessage(string $text = 'Áo này còn size M không?'): PromptMessage
{
    return new PromptMessage(MessageRole::User, [new TextBlock($text)]);
}

function turnContextAt(DateTimeImmutable $now): TurnContext
{
    $conversation = new ConversationRef(1, 2);

    return new TurnContext(
        $conversation, 3, 4, 5, 6,
        new Stimulus(StimulusKind::CustomerMessage, $conversation, 7, $now),
        AutonomyLevel::AutoSafe, 7, $now, 'Asia/Ho_Chi_Minh', $now->modify('+120 seconds'), Usage::zero(),
    );
}

it('nhận tên công cụ đúng chuẩn và từ chối tên sai', function (string $name, bool $valid) {
    $make = fn () => new ToolSpec($name, 'Look up knowledge.', OBJECT_SCHEMA, ToolKind::Read);

    $valid ? expect($make()->name)->toBe($name) : expect($make)->toThrow(InvalidArgumentException::class);
})->with([
    ['search_knowledge', true],
    ['ab', false],
    ['Search', false],
    ['search-knowledge', false],
    [str_repeat('a', 65), false],
]);

it('từ chối schema công cụ không phải object', function () {
    new ToolSpec('reply', 'Reply to the customer.', ['type' => 'string'], ToolKind::Terminal);
})->throws(InvalidArgumentException::class);

it('giới hạn id lời gọi công cụ 64 ký tự', function () {
    expect((new ToolCall(str_repeat('x', 64), 'reply', []))->id)->toHaveLength(64);

    new ToolCall(str_repeat('x', 65), 'reply', []);
})->throws(InvalidArgumentException::class);

it('bắt kết quả lỗi của công cụ luôn có hướng sửa', function () {
    $failure = ToolResult::failure(ToolErrorCode::UnsourcedClaim, 'Use consult_staff.');

    expect($failure->ok)->toBeFalse()
        ->and($failure->errorCode)->toBe(ToolErrorCode::UnsourcedClaim)
        ->and(ToolResult::success([], 'nothing found; use consult_staff')->ok)->toBeTrue();

    ToolResult::failure(ToolErrorCode::InvalidArgs, '  ');
})->throws(InvalidArgumentException::class);

it('giữ bất biến của prompt', function (Closure $make) {
    $make();
})->throws(InvalidArgumentException::class)->with([
    'không có tin' => fn () => new Prompt([], [], []),
    'mở đầu bằng assistant' => fn () => new Prompt([], [], [new PromptMessage(MessageRole::Assistant, [new TextBlock('Dạ')])]),
    'điểm ngắt cache ngoài phạm vi' => fn () => new Prompt([], [], [userMessage()], 1),
    'trùng tên công cụ' => fn () => new Prompt([], [
        new ToolSpec('reply', 'Reply.', OBJECT_SCHEMA, ToolKind::Terminal),
        new ToolSpec('reply', 'Reply again.', OBJECT_SCHEMA, ToolKind::Terminal),
    ], [userMessage()]),
    'kết quả công cụ trong tin assistant' => fn () => new PromptMessage(MessageRole::Assistant, [new ToolResultBlock('call_1', '{}')]),
    'lời gọi công cụ trong tin user' => fn () => new PromptMessage(MessageRole::User, [new ToolCall('call_1', 'reply', [])]),
]);

it('chỉ phản hồi lỗi mới mang ModelError', function () {
    $error = new ModelError(ModelErrorKind::Retryable, 'overloaded', 529);
    $failed = ModelResponse::failed($error, Usage::zero());

    expect($failed->finishReason)->toBe(FinishReason::Error)
        ->and($failed->error)->toBe($error);

    new ModelResponse([], FinishReason::EndTurn, Usage::zero(), error: $error);
})->throws(InvalidArgumentException::class);

it('tách chữ và lời gọi công cụ theo đúng thứ tự phát', function () {
    $search = new ToolCall('call_1', 'search_knowledge', ['query' => 'áo thun size M']);
    $response = new ModelResponse([new TextBlock('Để em kiểm tra'), $search], FinishReason::ToolUse, Usage::zero());

    expect($response->toolCalls())->toBe([$search])
        ->and($response->text())->toBe('Để em kiểm tra');
});

it('cộng dồn số đo qua các bước, giữ lý do trượt cache của lần sau cùng', function () {
    $total = (new Usage(100, 20, 80, 0, 500, 900, 'route_changed'))->plus(new Usage(50, 10, 40, 10, 300, 700));

    expect([$total->inputTokens, $total->outputTokens, $total->cacheReadTokens, $total->cacheWriteTokens, $total->costMicroUsd, $total->latencyMs])
        ->toBe([150, 30, 120, 10, 800, 1600])
        ->and($total->cacheMissReason)->toBe('route_changed');

    new Usage(inputTokens: -1);
})->throws(InvalidArgumentException::class);

it('tạo bối cảnh lượt mới bằng with*, bản cũ giữ nguyên', function () {
    $context = turnContextAt(new DateTimeImmutable('2026-10-15 09:00:00'));

    $steered = $context->withSnapshotMessageId(9)->withUsage(new Usage(10, 5));

    expect($context->snapshotMessageId)->toBe(7)
        ->and($context->usageSoFar->inputTokens)->toBe(0)
        ->and($steered->snapshotMessageId)->toBe(9)
        ->and($steered->usageSoFar->inputTokens)->toBe(10)
        ->and($steered->aiAgentId)->toBe($context->aiAgentId);
});

it('từ chối bối cảnh lượt có hạn chót không sau lúc bắt đầu', function () {
    $now = new DateTimeImmutable('2026-10-15 09:00:00');
    $conversation = new ConversationRef(1, 2);

    new TurnContext(
        $conversation, 3, null, 5, 6,
        new Stimulus(StimulusKind::CustomerMessage, $conversation, 7, $now),
        AutonomyLevel::AutoSafe, 7, $now, 'Asia/Ho_Chi_Minh', $now, Usage::zero(),
    );
})->throws(InvalidArgumentException::class);

it('chỉ quyết định Respond mới nêu AI agent', function () {
    expect(StimulusDecision::respond(5)->aiAgentId)->toBe(5)
        ->and(StimulusDecision::decline('group_thread')->kind)->toBe(StimulusDecisionKind::Decline)
        ->and(StimulusDecision::ignore('auto_responder_off')->aiAgentId)->toBeNull();
});

it('biên nhận ghi vào lõi hoặc có id tin hoặc có lý do từ chối', function () {
    expect(DeliveryReceipt::delivered(42)->isDelivered())->toBeTrue()
        ->and(DeliveryReceipt::failed(DeliveryFailure::FloorLost)->failure)->toBe(DeliveryFailure::FloorLost);
});

it('địa chỉ hội thoại luôn có account', function () {
    new ConversationRef(0, 2);
})->throws(InvalidArgumentException::class);
