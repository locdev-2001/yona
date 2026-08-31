<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/teams_controller_spec.rb.

function teamAccount(): Account
{
    return Account::factory()->create();
}

function teamMemberUser(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

describe('GET /api/v1/accounts/{id}/teams', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = teamAccount();

        $this->getJson("/api/v1/accounts/{$account->id}/teams")->assertUnauthorized();
    });

    it('returns all the teams', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $agent = teamMemberUser($account);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/teams")
            ->assertOk();

        expect($response->json('0.id'))->toBe($team->id)
            ->and($response->json('0.is_member'))->toBeFalse();
    });
});

describe('GET /api/v1/accounts/{id}/teams/{teamId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);

        $this->getJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")->assertUnauthorized();
    });

    it('returns the team', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $agent = teamMemberUser($account);
        $team->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")
            ->assertOk();

        expect($response->json('id'))->toBe($team->id)
            ->and($response->json('is_member'))->toBeTrue();
    });

    it('does not expose a team of another account', function () {
        $account = teamAccount();
        $agent = teamMemberUser($account);
        $otherTeam = Team::factory()->create(['account_id' => teamAccount()->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/teams/{$otherTeam->id}")
            ->assertNotFound();
    });
});

describe('POST /api/v1/accounts/{id}/teams', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = teamAccount();

        $this->postJson("/api/v1/accounts/{$account->id}/teams")->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = teamAccount();
        $agent = teamMemberUser($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/teams", ['name' => 'Test Team'])
            ->assertUnauthorized();
    });

    it('creates a new team when administrator', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", [
                'name' => 'Test Team',
                'description' => 'Sales crew',
                'allow_auto_assign' => false,
            ])
            ->assertOk();

        // before_validation: tên hạ chữ thường + trim.
        expect($response->json('name'))->toBe('test team')
            ->and($response->json('allow_auto_assign'))->toBeFalse()
            ->and($account->teams()->count())->toBe(1);
    });

    it('creates a team when the icon fields arrive empty', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);

        // Form gửi icon rỗng; ConvertEmptyStringsToNull biến '' thành null.
        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", [
                'name' => 'Sales Crew',
                'description' => 'Doi ban hang',
                'allow_auto_assign' => true,
                'icon' => null,
                'icon_color' => null,
            ])
            ->assertOk();

        expect($response->json('name'))->toBe('sales crew')
            ->and($response->json('icon'))->toBeNull();
    });

    it('rejects a name that is blank after normalization', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", ['name' => "\t\n  "])
            ->assertUnprocessable();

        expect($account->teams()->count())->toBe(0);
    });

    it('rejects a duplicate name that differs only by case', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);
        Team::factory()->create(['account_id' => $account->id, 'name' => 'sales']);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", ['name' => 'Sales'])
            ->assertUnprocessable();
    });

    it('rejects a duplicate name within the same account', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);
        Team::factory()->create(['account_id' => $account->id, 'name' => 'sales']);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", ['name' => 'sales'])
            ->assertUnprocessable();
    });

    it('allows the same team name in a different account', function () {
        $account = teamAccount();
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);
        Team::factory()->create(['account_id' => teamAccount()->id, 'name' => 'sales']);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/teams", ['name' => 'sales'])
            ->assertOk();
    });
});

describe('PUT /api/v1/accounts/{id}/teams/{teamId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);

        $this->putJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $agent = teamMemberUser($account);

        $this->actingAs($agent)
            ->putJson("/api/v1/accounts/{$account->id}/teams/{$team->id}", ['name' => 'new-team'])
            ->assertUnauthorized();
    });

    it('updates an existing team when administrator', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->putJson("/api/v1/accounts/{$account->id}/teams/{$team->id}", ['name' => 'new-team'])
            ->assertOk();

        expect($team->refresh()->name)->toBe('new-team');
    });

    it('keeps its own name valid on update', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id, 'name' => 'sales']);
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->putJson("/api/v1/accounts/{$account->id}/teams/{$team->id}", [
                'name' => 'sales',
                'description' => 'updated',
            ])
            ->assertOk();

        expect($team->refresh()->description)->toBe('updated');
    });
});

describe('DELETE /api/v1/accounts/{id}/teams/{teamId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);

        $this->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $agent = teamMemberUser($account);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")
            ->assertUnauthorized();
    });

    it('destroys the team and its members when administrator', function () {
        $account = teamAccount();
        $team = Team::factory()->create(['account_id' => $account->id]);
        $admin = teamMemberUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $team->addMembers([$admin->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/teams/{$team->id}")
            ->assertOk();

        expect(Team::count())->toBe(0)
            ->and(TeamMember::count())->toBe(0);
    });
});
