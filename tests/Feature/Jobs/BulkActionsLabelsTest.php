<?php

use App\Jobs\BulkActionsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Redis;

// Nhánh nhãn của spec/jobs/bulk_actions_job_spec.rb (phần còn lại ở
// BulkActionsJobTest, đóng cùng B6).

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create(['name' => 'Agent Smith']);
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $inbox->inboxMembers()->create(['user_id' => $this->agent->id]);

    foreach (['billing', 'vip', 'support'] as $title) {
        Label::factory()->create(['account_id' => $this->account->id, 'title' => $title]);
    }

    $this->conversations = collect(range(1, 2))->map(fn () => Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $inbox->id,
    ]));

    $this->ids = $this->conversations->pluck('display_id')->all();
});

function bulkLabelParams(array $labels): array
{
    return ['type' => 'Conversation', 'ids' => test()->ids, 'labels' => $labels];
}

it('adds labels to every selected conversation', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkLabelParams(['add' => ['billing', 'vip']])))->handle();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->labelList())->all())
        ->toBe([['billing', 'vip'], ['billing', 'vip']])
        ->and($this->conversations->first()->fresh()->cached_label_list)->toBe('billing, vip');
});

it('keeps labels already on the conversation when adding', function () {
    $this->conversations->first()->updateLabels(['support']);

    (new BulkActionsJob($this->account, $this->agent, bulkLabelParams(['add' => ['billing']])))->handle();

    expect($this->conversations->first()->labelList())->toBe(['support', 'billing']);
});

it('removes labels from every selected conversation', function () {
    $this->conversations->each(fn (Conversation $conversation) => $conversation->updateLabels(['billing', 'vip']));

    (new BulkActionsJob($this->account, $this->agent, bulkLabelParams(['remove' => ['billing']])))->handle();

    expect($this->conversations->map(fn (Conversation $conversation) => $conversation->labelList())->all())
        ->toBe([['vip'], ['vip']]);
});

it('creates the label activity message with the acting user name', function () {
    (new BulkActionsJob($this->account, $this->agent, bulkLabelParams(['add' => ['billing']])))->handle();

    expect($this->conversations->first()->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content')->all())
        ->toBe(['Agent Smith added billing']);
});
