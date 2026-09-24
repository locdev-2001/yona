<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->addMembers([$this->agent->id]);
});

it('adds the new assignee as a participant', function () {
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $conversation->update(['assignee_id' => $this->agent->id]);

    expect($conversation->conversationParticipants()->pluck('user_id')->all())->toBe([$this->agent->id]);
});

it('keeps a single participant row when the same agent is reassigned', function () {
    $conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'assignee_id' => $this->agent->id,
    ]);

    $conversation->update(['assignee_id' => null]);
    $conversation->update(['assignee_id' => $this->agent->id]);

    expect($conversation->conversationParticipants()->count())->toBe(1);
});

it('does not add a participant when the assignee is cleared', function () {
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $conversation->update(['assignee_id' => null]);

    expect($conversation->conversationParticipants()->count())->toBe(0);
});
