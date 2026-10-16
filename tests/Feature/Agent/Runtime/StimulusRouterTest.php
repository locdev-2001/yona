<?php

use App\Agent\Runtime\StimulusRouter;
use App\Agent\Runtime\TurnSettings;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\StimulusDecisionKind;
use App\Models\ApiLog;
use App\Models\Message;
use Tests\Feature\Agent\Runtime\ScriptedLanguageModel as Model;
use Tests\Feature\Agent\Runtime\TurnKit;
use Tests\Support\QueryCounter;

beforeEach(fn () => TurnKit::boot());

function routedSnapshot(array $overrides = []): ConversationSnapshot
{
    return new ConversationSnapshot(...[
        'ref' => new ConversationRef(1, 2),
        'inboxId' => 3,
        'contactId' => 4,
        'assigneeUserId' => null,
        'aiAgentId' => 7,
        'floorHeldUntil' => null,
        'canReply' => true,
        'isGroup' => false,
        'timezone' => 'Asia/Ho_Chi_Minh',
        'channel' => 'zalo',
        'accountActive' => true,
        ...$overrides,
    ]);
}

it('decides in a fixed order', function (?array $overrides, StimulusDecisionKind $kind, string $reason, bool $enabled = true) {
    config(['agent.turn.enabled' => $enabled, 'agent.turn.daily_budget_usd' => 0]);
    app()->forgetInstance(TurnSettings::class);

    $decision = app(StimulusRouter::class)->decide($overrides === null ? null : routedSnapshot($overrides));

    expect($decision->kind)->toBe($kind)->and($decision->reason)->toBe($reason);
})->with([
    'platform kill switch' => [[], StimulusDecisionKind::Ignore, 'kill_switch', false],
    'conversation gone' => [null, StimulusDecisionKind::Ignore, 'conversation_missing'],
    'account suspended' => [['accountActive' => false], StimulusDecisionKind::Ignore, 'account_inactive'],
    'manual or no AI on the inbox' => [['aiAgentId' => null], StimulusDecisionKind::Ignore, 'no_replying_ai_agent'],
    'group conversation' => [['isGroup' => true], StimulusDecisionKind::Decline, 'group_conversation'],
    'auto reply' => [[], StimulusDecisionKind::Respond, 'respond'],
]);

it('only forwards public customer messages of an auto-reply conversation', function () {
    ['conversation' => $conversation, 'staff' => $staff] = TurnKit::autoConversation();

    TurnKit::staffSays($conversation, $staff, 'Ghi chú riêng', private: true);
    Message::factory()->activity()->create([
        'account_id' => $conversation->account_id, 'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id, 'content' => 'Đã gán cho Minh',
    ]);
    expect(TurnKit::pendingTurns())->toBeEmpty();

    TurnKit::customerSays($conversation, 'Shop ơi');
    expect(TurnKit::pendingTurns())->toHaveCount(1);
});

function spendQueries(QueryCounter $counter): int
{
    return count(array_filter($counter->statements(), fn (string $sql) => str_contains($sql, 'sum(') && str_contains($sql, 'api_logs')));
}

function spendOf(int $accountId, int $microUsd): void
{
    ApiLog::query()->create(['account_id' => $accountId, 'provider' => 'anthropic', 'model' => 'claude-test', 'request' => [], 'cost_micro_usd' => $microUsd]);
}

it('sums the day\'s model spend once per customer message, not again when the turn wakes', function () {
    config(['agent.turn.daily_budget_usd' => 1]);
    app()->forgetInstance(TurnSettings::class);
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::model([Model::call('wait_for_customer', ['reason' => 'Sticker.'])]);

    $counter = QueryCounter::measure(function () use ($conversation) {
        TurnKit::customerSays($conversation, 'Shop ơi');
        TurnKit::runPendingTurns();
    });

    expect(spendQueries($counter))->toBe(1);
});

it('sees the budget run out once the short spend cache expires, and stays paused after', function () {
    config(['agent.turn.daily_budget_usd' => 1]);
    app()->forgetInstance(TurnSettings::class);
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::model([]);

    TurnKit::customerSays($conversation, 'Shop ơi');
    spendOf($conversation->account_id, 1_000_000);
    TurnKit::customerSays($conversation, 'Có ai không?');
    $beforeExpiry = count(TurnKit::pendingTurns());

    $this->travel(31)->seconds();
    TurnKit::customerSays($conversation, 'Alo shop');
    $afterExpiry = count(TurnKit::pendingTurns());
    $counter = QueryCounter::measure(fn () => TurnKit::customerSays($conversation, 'Shop ơi trả lời đi'));

    expect($beforeExpiry)->toBe(2)
        ->and($afterExpiry)->toBe(2)
        ->and(count(TurnKit::pendingTurns()))->toBe(2)
        ->and(spendQueries($counter))->toBe(0)
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1);
});
