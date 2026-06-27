<?php

use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Support\Facades\Route;

// Layer 2 (IdentifyWorkspace middleware) — server-derived active workspace
// + membership requirement (BR-X14, auth-model resolution order).

function workspaceProbeRoute(): void
{
    Route::middleware(['web', 'auth', 'workspace'])->get('/_test/current-workspace', fn () => response()->json([
        'workspace' => currentWorkspace()?->id,
        'membership' => currentMembership()?->id,
    ]));
}

it('binds the active workspace + membership for a member', function () {
    workspaceProbeRoute();

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    setWorkspaceContext($ws->id); // satisfy RLS WITH CHECK for the insert only
    $member = WorkspaceMember::factory()->for($ws)->create(['user_id' => $user->id, 'role' => 'admin', 'status' => 'active']);
    clearWorkspaceContext(); // the middleware must establish context itself

    $this->actingAs($user)->get('/_test/current-workspace')
        ->assertOk()
        ->assertJson(['workspace' => $ws->id, 'membership' => $member->id]);
});

it('aborts 403 when the user has no active membership (BR-X14)', function () {
    workspaceProbeRoute();

    $user = User::factory()->create();

    $this->actingAs($user)->get('/_test/current-workspace')->assertForbidden();
});

it('aborts 403 when the only membership is deactivated', function () {
    workspaceProbeRoute();

    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    setWorkspaceContext($ws->id);
    WorkspaceMember::factory()->for($ws)->deactivated()->create(['user_id' => $user->id]);
    clearWorkspaceContext();

    $this->actingAs($user)->get('/_test/current-workspace')->assertForbidden();
});
