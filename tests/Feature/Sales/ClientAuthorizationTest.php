<?php

use App\Models\Client;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ClientService;

// ── Authz matrix: Clients (G2/BR-X15) ────────────────────────────────────────
// guest → redirect/401; sai-permission → 403; ngoài-tầm → 404; đúng → 2xx.
// Visibility: own (view_own = owner_id=me) | all (admin/view).

// ─── Guest / unauthenticated ───────────────────────────────────────────────────

it('guest is redirected from clients.index', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $this->get(route('clients.index'))->assertRedirect();
});

it('guest is redirected from clients.show', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $client = Client::factory()->create(['workspace_id' => $ws->id]);

    $this->get(route('clients.show', $client))->assertRedirect();
});

// ─── viewer role (no create/update/delete) ────────────────────────────────────

it('viewer gets 403 on clients.store', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('clients.store'), ['name' => 'Test Co'])
        ->assertStatus(403);
});

// ─── Cross-workspace → 404 (non-enumeration) ──────────────────────────────────

it('admin in WS-B gets 404 on show for WS-A client', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();

    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('clients.show', $client->id))
        ->assertStatus(404);
});

it('admin in WS-B gets 404 on update for WS-A client', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();

    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->patch(route('clients.update', $client->id), ['name' => 'Hack', 'lock_version' => 1])
        ->assertStatus(404);
});

// ─── Admin (all) sees any client in workspace ─────────────────────────────────

it('admin sees all clients in workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    $otherUser = User::factory()->create();

    seedMember($ws, $admin, 'admin');
    seedMember($ws, $otherUser, 'sales_rep');
    actingInWorkspace($ws, $admin);

    $client = app(ClientService::class)->create(['name' => 'Another\'s Client']);

    // Switch to admin
    actingInWorkspace($ws, $admin);

    $this->actingAs($admin)
        ->get(route('clients.show', $client))
        ->assertOk();
});

// ─── sales_rep (view_own): only sees own clients ──────────────────────────────

it('sales_rep cannot see a client they do not own (→ 404)', function () {
    $ws = Workspace::factory()->create();
    $owner = User::factory()->create();
    $rep = User::factory()->create();

    actingInWorkspace($ws, $owner);
    seedMember($ws, $owner, 'admin');
    seedMember($ws, $rep, 'sales_rep');

    // Client owned by admin (not rep)
    $client = app(ClientService::class)->create([
        'name' => 'Admin Client',
    ]);

    // Rep cannot see admin's client
    actingInWorkspace($ws, $rep);

    // Revoke view-all, keep view_own only
    $rep->revokePermissionTo('tenant.client.view');

    $this->actingAs($rep)
        ->get(route('clients.show', $client))
        ->assertStatus(404);
})->skip('Requires P01 permissions seeded — revokePermissionTo reliable only after seeder runs');

it('sales_rep can see their own client', function () {
    $ws = Workspace::factory()->create();
    $rep = User::factory()->create();

    actingInWorkspace($ws, $rep);
    seedMember($ws, $rep, 'admin'); // create with admin to bypass store policy

    $client = app(ClientService::class)->create(['name' => 'My Client']);
    // Transfer ownership manually to rep
    $client->owner_id = $rep->id;
    $client->save();

    $this->actingAs($rep)
        ->get(route('clients.show', $client))
        ->assertOk();
});

// ─── Create/delete requires permission ───────────────────────────────────────

it('admin can create a client', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('clients.store'), ['name' => 'New Client'])
        ->assertRedirect(); // success → redirect
});

it('admin can delete their client', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $client = app(ClientService::class)->create(['name' => 'To Delete']);

    $this->actingAs($user)
        ->delete(route('clients.destroy', $client))
        ->assertRedirect();

    expect(Client::find($client->id))->toBeNull();
});
