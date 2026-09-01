<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Api;
use App\Models\Inbox;
use App\Models\User;

// Port từ spec/models/inbox_spec.rb (phần áp dụng cho B1 — cache invalidation
// dispatcher + các kênh khác port sau).

it('adds all the given members', function () {
    $inbox = Inbox::factory()->create();
    $users = User::factory()->count(3)->create();

    $inbox->addMembers($users->pluck('id')->all());

    expect($inbox->refresh()->inboxMembers)->toHaveCount(3);
});

it('removes the given members', function () {
    $inbox = Inbox::factory()->create();
    $users = User::factory()->count(3)->create();
    $inbox->addMembers($users->pluck('id')->all());

    $inbox->removeMembers($users->pluck('id')->all());

    expect($inbox->refresh()->inboxMembers)->toHaveCount(0);
});

it('detects the api channel type', function () {
    $inbox = Inbox::factory()->create();

    expect($inbox->isApi())->toBeTrue()
        ->and($inbox->channel)->toBeInstanceOf(Api::class)
        ->and($inbox->channel_type)->toBe('Channel::Api');
});

it('generates identifier, hmac token and secret for a new api channel', function () {
    $channel = Api::factory()->create();

    expect($channel->identifier)->toHaveLength(24)
        ->and($channel->hmac_token)->toHaveLength(24)
        ->and($channel->secret)->toHaveLength(24);
});

it('returns inbox members plus administrators as assignable agents', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    $admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id, 'user_id' => $admin->id, 'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT,
    ]);
    $outsideAgent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id, 'user_id' => $outsideAgent->id, 'role' => AccountUser::ROLE_AGENT,
    ]);
    $inbox->addMembers([$agent->id, $admin->id]);

    expect($inbox->assignableAgents()->pluck('id')->sort()->values()->all())
        ->toBe(collect([$admin->id, $agent->id])->sort()->values()->all());
});

it('orders inboxes case-insensitively by name', function () {
    $account = Account::factory()->create();
    Inbox::factory()->create(['account_id' => $account->id, 'name' => 'beta']);
    Inbox::factory()->create(['account_id' => $account->id, 'name' => 'Alpha']);

    expect($account->inboxes()->orderByName()->pluck('name')->all())->toBe(['Alpha', 'beta']);
});

it('destroys the channel when the inbox is destroyed', function () {
    $inbox = Inbox::factory()->create();
    $channelId = $inbox->channel_id;

    $inbox->delete();

    expect(Api::query()->find($channelId))->toBeNull();
});
