<?php

use App\Models\Client;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Support\Facades\DB;

/**
 * Tenant isolation: client created in WS-A must be invisible in WS-B.
 * Covers both Eloquent global scope (layer 1) and Postgres RLS (layer 3).
 */
it('client created in WS-A is invisible in WS-B (eloquent scope)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create(['name' => 'WS-A Client']);

    // Switch to WS-B — eloquent global scope filters by workspace
    clearWorkspaceContext();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    expect(Client::where('name', 'WS-A Client')->exists())->toBeFalse();
    expect(Client::all())->toHaveCount(0);
});

it('client created in WS-A returns 404 when accessed from WS-B (RLS + route model binding)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $client = Client::factory()->create();
    $clientId = $client->id;

    clearWorkspaceContext();

    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('clients.show', ['client' => $clientId]))
        ->assertStatus(404);
});

it('raw SQL returns 0 rows for WS-A client when context is WS-B (RLS)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    Client::factory()->create();

    // Switch RLS context to WS-B
    setWorkspaceContext($wsB->id);

    $count = DB::table('clients')->where('workspace_id', $wsA->id)->count();
    expect($count)->toBe(0);
});
