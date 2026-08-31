<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Tương đương meta.permissions: ['administrator'] của agent.routes.js —
// route ngoài quyền đưa về dashboard (routeHelpers#defaultRedirectPage).

it('renders the agents settings page for an administrator', function () {
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    $this->actingAs($admin)->get("/app/accounts/{$account->id}/settings/agents/list")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/settings/agents/Index'));
});

it('redirects an agent away from the agents settings page', function () {
    $account = Account::factory()->create();
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);

    $this->actingAs($agent)->get("/app/accounts/{$account->id}/settings/agents/list")
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");
});

it('redirects the bare agents path to the list', function () {
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    $this->actingAs($admin)->get("/app/accounts/{$account->id}/settings/agents")
        ->assertRedirect("/app/accounts/{$account->id}/settings/agents/list");
});
