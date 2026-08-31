<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Team;
use App\Models\User;

// Tương đương meta.permissions: ['administrator'] của teams.routes.js —
// mọi bước wizard đều chỉ dành cho administrator.

function teamsPageAdmin(Account $account): User
{
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    return $admin;
}

it('renders the teams list for an administrator', function () {
    $account = Account::factory()->create();

    $this->actingAs(teamsPageAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/teams/list")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/settings/teams/Index'));
});

it('redirects an agent away from the teams list', function () {
    $account = Account::factory()->create();
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);

    $this->actingAs($agent)
        ->get("/app/accounts/{$account->id}/settings/teams/list")
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");
});

it('redirects the bare teams path to the list', function () {
    $account = Account::factory()->create();

    $this->actingAs(teamsPageAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/teams")
        ->assertRedirect("/app/accounts/{$account->id}/settings/teams/list");
});

it('renders each step of the create wizard', function () {
    $account = Account::factory()->create();
    $admin = teamsPageAdmin($account);
    $team = Team::factory()->create(['account_id' => $account->id]);

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/new")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/settings/teams/CreateTeam'));

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/new/{$team->id}/agents")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/teams/AddAgents')
            ->where('team.id', $team->id));

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/new/{$team->id}/finish")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/teams/FinishSetup')
            ->where('flow', 'create'));
});

it('renders each step of the edit wizard', function () {
    $account = Account::factory()->create();
    $admin = teamsPageAdmin($account);
    $team = Team::factory()->create(['account_id' => $account->id]);

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/{$team->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/teams/EditTeam')
            ->where('team.name', $team->name));

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/{$team->id}/edit/agents")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/settings/teams/EditAgents'));

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/{$team->id}/edit/finish")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/teams/FinishSetup')
            ->where('flow', 'edit'));
});

it('does not expose a team from another account in the wizard', function () {
    $account = Account::factory()->create();
    $admin = teamsPageAdmin($account);
    $otherTeam = Team::factory()->create(['account_id' => Account::factory()->create()->id]);

    $this->actingAs($admin)
        ->get("/app/accounts/{$account->id}/settings/teams/{$otherTeam->id}/edit")
        ->assertNotFound();
});
