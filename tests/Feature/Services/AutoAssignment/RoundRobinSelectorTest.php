<?php

use App\Models\Account;
use App\Models\Inbox;
use App\Models\User;
use App\Services\AutoAssignment\RoundRobinSelector;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/auto_assignment/round_robin_selector_spec.rb — bản gốc
// giả lập InboxRoundRobinService, ở đây chạy thẳng qua Redis thật.

beforeEach(function () {
    Redis::flushdb();
});

it('returns null when there is no available agent', function () {
    $inbox = Inbox::factory()->create();

    expect((new RoundRobinSelector($inbox))->selectAgent(new Collection))->toBeNull();
});

it('selects an agent from the available members', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $members = collect(range(1, 3))
        ->map(fn () => $inbox->inboxMembers()->create(['user_id' => User::factory()->create()->id]));

    $selected = (new RoundRobinSelector($inbox))->selectAgent($members);

    expect($selected)->toBeInstanceOf(User::class)
        ->and($members->pluck('user_id')->all())->toContain($selected->id);
});

it('spreads picks across the available members', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $members = collect(range(1, 2))
        ->map(fn () => $inbox->inboxMembers()->create(['user_id' => User::factory()->create()->id]));

    $selector = new RoundRobinSelector($inbox);
    $picks = [$selector->selectAgent($members)->id, $selector->selectAgent($members)->id];

    expect($picks)->toEqualCanonicalizing($members->pluck('user_id')->all());
});
