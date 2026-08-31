<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Team;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/team_members_controller_spec.rb.

function membersTeamFor(Account $account): Team
{
    return Team::factory()->create(['account_id' => $account->id]);
}

function accountAgent(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

describe('GET /api/v1/accounts/{id}/teams/{teamId}/team_members', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);

        $this->getJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members")
            ->assertUnauthorized();
    });

    it('returns the team members', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $agent = accountAgent($account);
        $team->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members")
            ->assertOk();

        expect($response->json('0.id'))->toBe($agent->id)
            ->and($response->json('0.role'))->toBe('agent');
    });
});

describe('POST /api/v1/accounts/{id}/teams/{teamId}/team_members', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);

        $this->postJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members")
            ->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $agent = accountAgent($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('adds only the members that are not in the team yet', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $admin = accountAgent($account, AccountUser::ROLE_ADMINISTRATOR);
        $userIds = collect(range(1, 5))->map(fn () => accountAgent($account)->id)->all();
        $team->addMembers([$userIds[0]]);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => $userIds,
            ])
            ->assertOk();

        expect($response->json())->toHaveCount(count($userIds) - 1)
            ->and($team->members()->count())->toBe(5);
    });
});

describe('PATCH /api/v1/accounts/{id}/teams/{teamId}/team_members', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);

        $this->patchJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members")
            ->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $agent = accountAgent($account);

        $this->actingAs($agent)
            ->patchJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('replaces the member list when administrator', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $admin = accountAgent($account, AccountUser::ROLE_ADMINISTRATOR);
        $removed = accountAgent($account);
        $team->addMembers([$removed->id]);
        $userIds = collect(range(1, 5))->map(fn () => accountAgent($account)->id)->all();

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => $userIds,
            ])
            ->assertOk();

        expect($response->json())->toHaveCount(count($userIds))
            ->and($team->members()->pluck('users.id')->all())->not->toContain($removed->id);
    });

    it('rejects user ids outside the account', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $admin = accountAgent($account, AccountUser::ROLE_ADMINISTRATOR);
        $outsider = accountAgent(Account::factory()->create());

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => [$outsider->id],
            ])
            ->assertUnauthorized();

        expect($response->json('message'))->toBe('Invalid User IDs');
    });
});

describe('DELETE /api/v1/accounts/{id}/teams/{teamId}/team_members', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);

        $this->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members")
            ->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $agent = accountAgent($account);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('removes the given members when administrator', function () {
        $account = Account::factory()->create();
        $team = membersTeamFor($account);
        $admin = accountAgent($account, AccountUser::ROLE_ADMINISTRATOR);
        $userIds = collect(range(1, 5))->map(fn () => accountAgent($account)->id)->all();
        $team->addMembers($userIds);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}/team_members", [
                'user_ids' => array_slice($userIds, 0, 3),
            ])
            ->assertOk();

        expect($team->teamMembers()->count())->toBe(2);
    });
});
