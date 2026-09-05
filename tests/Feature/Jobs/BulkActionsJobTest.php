<?php

use App\Jobs\BulkActionsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Redis;

// Port từ spec/jobs/bulk_actions_job_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->conversations = collect(range(1, 3))->map(function () {
        $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $inbox->inboxMembers()->create(['user_id' => $this->agent->id]);

        return Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $inbox->id,
            'status' => Conversation::STATUS_OPEN,
        ]);
    });

    $this->ids = $this->conversations->pluck('display_id')->all();
});

function bulkParams(array $overrides = []): array
{
    return ['type' => 'Conversation', 'ids' => test()->ids, 'fields' => null, 'snoozed_until' => null, ...$overrides];
}

it('runs on the medium queue', function () {
    expect((new BulkActionsJob($this->account, $this->agent, bulkParams()))->queue)->toBe('medium');
});

it('bulk updates the status', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkParams(['fields' => ['status' => 'snoozed']])))->handle();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->refresh()->statusName())->all())
        ->toBe(['snoozed', 'snoozed', 'snoozed']);
});

it('bulk updates the assignee', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkParams(['fields' => ['assignee_id' => $this->agent->id]])))->handle();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->refresh()->assignee_id)->all())
        ->toBe([$this->agent->id, $this->agent->id, $this->agent->id]);
});

it('bulk updates snoozed_until together with the status', function () {
    $snoozedUntil = now()->addDay()->startOfSecond();

    (new BulkActionsJob($this->account, $this->agent, bulkParams([
        'fields' => ['status' => 'snoozed'],
        'snoozed_until' => (string) $snoozedUntil->getTimestamp(),
    ])))->handle();

    expect($this->conversations->first()->refresh()->snoozed_until->getTimestamp())->toBe($snoozedUntil->getTimestamp());
});

it('ignores a null status', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkParams(['fields' => ['status' => null]])))->handle();

    expect($this->conversations->first()->refresh()->statusName())->toBe('open');
});

it('skips conversations whose inbox the agent does not belong to', function () {
    $forbidden = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => Inbox::factory()->create(['account_id' => $this->account->id])->id,
        'status' => Conversation::STATUS_OPEN,
    ]);

    (new BulkActionsJob($this->account, $this->agent, bulkParams([
        'ids' => [$this->conversations->first()->display_id, $forbidden->display_id],
        'fields' => ['status' => 'resolved'],
    ])))->handle();

    expect($this->conversations->first()->refresh()->statusName())->toBe('resolved')
        ->and($forbidden->refresh()->statusName())->toBe('open');
});

it('lets an administrator touch every conversation of the account', function () {
    $administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $administrator->id]);
    $otherInboxConversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => Inbox::factory()->create(['account_id' => $this->account->id])->id,
        'status' => Conversation::STATUS_OPEN,
    ]);

    (new BulkActionsJob($this->account, $administrator, bulkParams([
        'ids' => [$otherInboxConversation->display_id],
        'fields' => ['status' => 'resolved'],
    ])))->handle();

    expect($otherInboxConversation->refresh()->statusName())->toBe('resolved');
});

it('assigns and removes a team, writing the matching activity', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
    $conversation = $this->conversations->first();

    (new BulkActionsJob($this->account, $this->agent, bulkParams([
        'ids' => [$conversation->display_id],
        'fields' => ['team_id' => $team->id],
    ])))->handle();

    expect($conversation->refresh()->team_id)->toBe($team->id)
        ->and($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("Assigned to {$team->name} by {$this->agent->name}");

    (new BulkActionsJob($this->account, $this->agent, bulkParams([
        'ids' => [$conversation->display_id],
        'fields' => ['team_id' => 0],
    ])))->handle();

    expect($conversation->refresh()->team_id)->toBeNull()
        ->and($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->reorder('id', 'desc')->first()->content)
        ->toBe("Unassigned from {$team->name} by {$this->agent->name}");
});

it('ignores a payload for an unsupported type', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkParams(['type' => 'Contact', 'fields' => ['status' => 'resolved']])))->handle();

    expect($this->conversations->first()->refresh()->statusName())->toBe('open');
});
