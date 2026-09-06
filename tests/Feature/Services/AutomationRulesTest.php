<?php

use App\Models\Account;
use App\Models\AutomationRule;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Message;
use App\Models\Team;
use App\Services\AutomationRules\ActionService;
use App\Services\AutomationRules\ConditionsFilterService;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
    $this->label = Label::factory()->create(['account_id' => $this->account->id, 'title' => 'pricing']);
    $this->team = Team::factory()->create(['account_id' => $this->account->id, 'name' => 'Sales']);
});

function d1RuleForTest(array $attributes = []): AutomationRule
{
    return AutomationRule::factory()->create(array_replace([
        'account_id' => test()->account->id,
        'event_name' => 'message_created',
        'conditions' => [[
            'attribute_key' => 'content',
            'filter_operator' => 'contains',
            'values' => ['giá'],
            'query_operator' => null,
        ]],
        'actions' => [
            ['action_name' => 'add_label', 'action_params' => ['pricing']],
            ['action_name' => 'assign_team', 'action_params' => [test()->team->id]],
        ],
    ], $attributes));
}

it('matches message content and combines conditions using AND and OR', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->conversation->inbox_id,
        'content' => 'Tôi muốn biết giá sản phẩm',
    ]);
    $rule = d1RuleForTest(['conditions' => [
        ['attribute_key' => 'content', 'filter_operator' => 'contains', 'values' => ['giá'], 'query_operator' => 'AND'],
        ['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open'], 'query_operator' => null],
    ]]);

    expect((new ConditionsFilterService($rule, $this->conversation, ['message' => $message]))->perform())->toBeTrue();

    $rule->update(['conditions' => [
        ['attribute_key' => 'content', 'filter_operator' => 'contains', 'values' => ['không có'], 'query_operator' => 'OR'],
        ['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open'], 'query_operator' => null],
    ]]);

    expect((new ConditionsFilterService($rule, $this->conversation, ['message' => $message]))->perform())->toBeTrue();
});

it('runs the real message event through the shared action executor', function () {
    $rule = d1RuleForTest();

    Message::factory()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->conversation->inbox_id,
        'content' => 'Cho tôi xin giá nhé',
    ]);

    expect($this->conversation->fresh()->labelList())->toContain('pricing')
        ->and($this->conversation->fresh()->team_id)->toBe($this->team->id)
        ->and($this->conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content')->implode(' | '))->toContain('Automation System')
        ->and($rule->fresh()->active)->toBeTrue();
});

it('runs all supported status and priority actions without retriggering the same rule', function () {
    $rule = d1RuleForTest([
        'conditions' => [[
            'attribute_key' => 'content', 'filter_operator' => 'contains', 'values' => ['go'], 'query_operator' => null,
        ]],
        'actions' => [
            ['action_name' => 'change_priority', 'action_params' => ['urgent']],
            ['action_name' => 'pending_conversation', 'action_params' => []],
        ],
    ]);

    (new ActionService($rule, $this->account, $this->conversation))->perform();

    expect($this->conversation->fresh()->priorityName())->toBe('urgent')
        ->and($this->conversation->fresh()->statusName())->toBe('pending');
});
