<?php

use App\Jobs\AutomationRules\ProcessPendingExecutionJob;
use App\Jobs\AutomationRules\TriggerPendingExecutionsJob;
use App\Models\Account;
use App\Models\AutomationRule;
use App\Models\AutomationRulePendingExecution;
use App\Models\Conversation;
use App\Models\Label;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->account->forceFill(['feature_flags' => ['delayed_automations' => true]])->save();
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'status' => Conversation::STATUS_PENDING]);
    $this->label = Label::factory()->create(['account_id' => $this->account->id, 'title' => 'stale']);
    $this->rule = AutomationRule::factory()->create([
        'account_id' => $this->account->id,
        'event_name' => 'conversation_updated',
        'execution_delay' => 60,
        'conditions' => [[
            'attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['pending'], 'query_operator' => null,
        ]],
        'actions' => [['action_name' => 'add_label', 'action_params' => ['stale']]],
    ]);
});

it('executes a due row and marks it executed', function () {
    $row = AutomationRulePendingExecution::schedule($this->rule, $this->conversation);
    $row->update(['due_at' => now()->subMinute()]);

    (new ProcessPendingExecutionJob($row->fresh()))->handle();

    expect($row->fresh()->status)->toBe(AutomationRulePendingExecution::STATUS_EXECUTED)
        ->and($this->conversation->fresh()->labelList())->toContain('stale');
});

it('skips a due row when the conversation left the episode', function () {
    $row = AutomationRulePendingExecution::schedule($this->rule, $this->conversation);
    $row->update(['due_at' => now()->subMinute()]);
    $this->conversation->update(['status' => Conversation::STATUS_OPEN]);

    (new ProcessPendingExecutionJob($row->fresh()))->handle();

    expect($row->fresh()->status)->toBe(AutomationRulePendingExecution::STATUS_SKIPPED)
        ->and($row->fresh()->skip_reason)->toBe('episode_moved');
});

it('sweeps only due rows for enabled accounts', function () {
    $row = AutomationRulePendingExecution::schedule($this->rule, $this->conversation);
    $row->update(['due_at' => now()->subMinute()]);

    expect(fn () => (new TriggerPendingExecutionsJob)->handle())
        ->not->toThrow(Throwable::class);

    expect($this->conversation->fresh()->labelList())->toContain('stale');
});
