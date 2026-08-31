<?php

use App\Models\Account;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;

// Port từ spec/models/team_spec.rb. Bỏ: các assert về dispatcher
// 'account.cache_invalidated' (cache invalidation vào cùng B4).

it('downcases the name', function () {
    $team = Team::factory()->create(['name' => 'Customer Support']);

    expect($team->name)->toBe('customer support');
});

it('strips control characters and surrounding whitespace', function () {
    $team = Team::factory()->create(['name' => "  Sales\n"]);

    expect($team->name)->toBe('sales');
});

it('removes control characters embedded within the name', function () {
    $team = Team::factory()->create(['name' => "su\npport"]);

    expect($team->name)->toBe('support');
});

it('reduces a name of only whitespace and control characters to blank', function () {
    expect(Team::normalizeName("\t\n  "))->toBe('');
});

it('adds all members', function () {
    $team = Team::factory()->create();
    $userIds = User::factory()->count(3)->create()->pluck('id')->all();

    $added = $team->addMembers($userIds);

    expect($added)->toHaveCount(3)
        ->and($team->teamMembers()->count())->toBe(3);
});

it('does not duplicate a member that is already in the team', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();

    $team->addMembers([$user->id]);
    $team->addMembers([$user->id]);

    expect($team->teamMembers()->count())->toBe(1);
});

it('removes the given members', function () {
    $team = Team::factory()->create();
    $userIds = User::factory()->count(3)->create()->pluck('id')->all();
    $team->addMembers($userIds);

    $team->removeMembers($userIds);

    expect($team->teamMembers()->count())->toBe(0);
});

it('deletes its members when the team is destroyed', function () {
    $team = Team::factory()->create();
    $team->addMembers([User::factory()->create()->id]);

    $team->delete();

    expect(TeamMember::count())->toBe(0);
});

it('belongs to an account', function () {
    $account = Account::factory()->create();
    $team = Team::factory()->create(['account_id' => $account->id]);

    expect($team->account->id)->toBe($account->id)
        ->and($account->teams()->count())->toBe(1);
});
