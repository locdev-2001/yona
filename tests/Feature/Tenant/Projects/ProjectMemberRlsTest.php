<?php

use App\Models\Client;
use App\Services\ProjectService;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Workspace;

// P08 — G4: Pivot RLS for project_members: raw query in WS-B context sees 0 rows from WS-A.

it('project_members pivot is invisible via raw query in other workspace context (G4)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $adminA = User::factory()->create();
    $memberA = User::factory()->create();

    actingInWorkspace($wsA, $adminA);
    seedMember($wsA, $adminA, 'admin');
    seedMember($wsA, $memberA, 'sales_rep');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'WS-A Project', 'client_id' => $client->id], $adminA->id);
    app(ProjectService::class)->addMember($project, $memberA->id);

    clearWorkspaceContext();

    // Switch RLS context to WS-B — project_members for WS-A must be 0 via raw query
    setWorkspaceContext($wsB->id);

    $count = DB::table('project_members')->count();
    expect($count)->toBe(0);
});
