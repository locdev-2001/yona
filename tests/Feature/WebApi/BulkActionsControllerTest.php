<?php

use App\Jobs\BulkActionsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

// Port từ spec/controllers/api/v1/accounts/bulk_actions_controller_spec.rb —
// nhánh Conversation (nhánh Contact chưa port).

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
    $this->conversations = collect(range(1, 2))->map(fn () => Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'status' => Conversation::STATUS_OPEN,
    ]));
    $this->url = "/api/v1/accounts/{$this->account->id}/bulk_actions";
});

it('returns unauthorized for guests', function () {
    $this->postJson($this->url, ['type' => 'Conversation', 'ids' => [1]])->assertUnauthorized();
});

it('rejects an unsupported type', function () {
    $this->actingAs($this->agent)
        ->postJson($this->url, ['type' => 'Test', 'fields' => ['status' => 'snoozed'], 'ids' => [1]])
        ->assertStatus(422)
        ->assertExactJson(['success' => false]);
});

it('queues the job with the permitted params only', function () {
    Queue::fake();

    $this->actingAs($this->agent)->postJson($this->url, [
        'type' => 'Conversation',
        'ids' => $this->conversations->pluck('display_id')->all(),
        'fields' => ['status' => 'snoozed', 'assignee_id' => $this->agent->id, 'rogue' => 'x'],
        'snoozed_until' => 1757000000,
    ])->assertOk();

    Queue::assertPushed(BulkActionsJob::class, function (BulkActionsJob $job) {
        return $job->account->id === $this->account->id
            && $job->user->id === $this->agent->id
            && $job->params['fields'] === ['status' => 'snoozed', 'assignee_id' => $this->agent->id]
            && $job->params['ids'] === $this->conversations->pluck('display_id')->all()
            && $job->params['labels'] === ['add' => [], 'remove' => []];
    });
});

it('applies the bulk status change', function () {
    $this->actingAs($this->agent)->postJson($this->url, [
        'type' => 'Conversation',
        'ids' => $this->conversations->pluck('display_id')->all(),
        'fields' => ['status' => 'snoozed'],
    ])->assertOk();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->refresh()->statusName())->all())
        ->toBe(['snoozed', 'snoozed']);
});

it('applies the bulk assignee change', function () {
    $this->actingAs($this->agent)->postJson($this->url, [
        'type' => 'Conversation',
        'ids' => $this->conversations->pluck('display_id')->all(),
        'fields' => ['assignee_id' => $this->agent->id],
    ])->assertOk();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->refresh()->assignee_id)->all())
        ->toBe([$this->agent->id, $this->agent->id]);
});
