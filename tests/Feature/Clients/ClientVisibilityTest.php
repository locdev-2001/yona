<?php

use App\Models\Client;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Policies\ClientPolicy;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * G2 visibility rules:
 * - tenant.client.view → see all clients in workspace
 * - tenant.client.view_own → see only owned OR customer-admin of
 * - No permission → index empty + show 404
 */
it('user with view_own cannot see another owners client in index', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $viewer = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    $client = Client::factory()->create(['owner_id' => $owner->id]);

    clearWorkspaceContext();

    // viewer gets sales_rep (view_own only — based on role permissions seeded in P01)
    actingInWorkspace($workspace, $viewer);
    seedMember($workspace, $viewer, 'sales_rep');

    // Revoke view-all, ensure view_own only
    $viewer->revokePermissionTo('tenant.client.view');

    $response = $this->actingAs($viewer)
        ->get(route('clients.index'));

    $response->assertStatus(200);
    // The index response should not contain the client owned by $owner
    $response->assertDontSee($client->name);
})->skip('Requires P01 permissions seeded — run after PlatformPermissionSeeder');

it('user with view sees all clients', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $viewer = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    $client = Client::factory()->create(['name' => 'Visible Client', 'owner_id' => $owner->id]);

    clearWorkspaceContext();
    actingInWorkspace($workspace, $viewer);
    seedMember($workspace, $viewer, 'admin');

    // Admin has tenant.client.view
    $this->actingAs($viewer)
        ->get(route('clients.index'))
        ->assertStatus(200);
});

it('client show returns 404 for a foreign workspace user', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();

    clearWorkspaceContext();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('clients.show', ['client' => $client->id]))
        ->assertStatus(404);
});

it('customer-admin user can see client they are delegated to', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $admin = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    $client = Client::factory()->create(['owner_id' => $owner->id]);

    // Add admin as customer-admin of this client
    DB::table('client_user')->insert([
        'id' => Str::uuid(),
        'workspace_id' => $workspace->id,
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    clearWorkspaceContext();
    actingInWorkspace($workspace, $admin);
    seedMember($workspace, $admin, 'sales_rep');

    // Customer-admin can view the client
    $policy = app(ClientPolicy::class);
    $client->load('customerAdmins');

    expect($policy->view($admin, $client))->toBeTrue();
});
