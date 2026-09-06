<?php

use App\Jobs\MacrosExecutionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Macro;
use App\Models\Message;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
    ]);

    $this->macro = Macro::factory()->create([
        'account_id' => $this->account->id,
        'created_by_id' => $this->user->id,
        'updated_by_id' => $this->user->id,
        'actions' => [['action_name' => 'resolve_conversation']],
    ]);
});

it('runs the macro on every conversation named by display id', function () {
    $first = Conversation::factory()->create(['account_id' => $this->account->id]);
    $second = Conversation::factory()->create(['account_id' => $this->account->id]);
    $untouched = Conversation::factory()->create(['account_id' => $this->account->id]);

    (new MacrosExecutionJob($this->macro, [$first->display_id, $second->display_id], $this->user))->handle();

    expect($first->fresh()->status)->toBe(Conversation::STATUS_RESOLVED)
        ->and($second->fresh()->status)->toBe(Conversation::STATUS_RESOLVED)
        ->and($untouched->fresh()->status)->toBe(Conversation::STATUS_OPEN);
});

it('ignores conversations of another account', function () {
    $foreignConversation = Conversation::factory()->create(['account_id' => Account::factory()->create()->id]);

    (new MacrosExecutionJob($this->macro, [$foreignConversation->display_id], $this->user))->handle();

    expect($foreignConversation->fresh()->status)->toBe(Conversation::STATUS_OPEN);
});

it('names the user who ran the macro in the activity messages', function () {
    Label::factory()->create(['account_id' => $this->account->id, 'title' => 'new-customer']);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id]);

    $this->macro->update(['actions' => [
        ['action_name' => 'add_label', 'action_params' => ['new-customer']],
        ['action_name' => 'resolve_conversation'],
    ]]);

    (new MacrosExecutionJob($this->macro->fresh(), [$conversation->display_id], $this->user))->handle();

    $activities = $conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content');

    expect($activities)->toContain("{$this->user->name} added new-customer")
        ->and($activities)->toContain("Conversation was marked resolved by {$this->user->name}")
        ->and(auth()->user())->toBeNull();
});
