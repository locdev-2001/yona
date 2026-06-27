<?php

use App\Models\Activity;
use App\Models\Team;
use Modules\Tenancy\Models\Workspace;
use App\Support\Activity\ActivityLogger;
use Illuminate\Support\Facades\DB;

// Tenant isolation: WS-B must NOT see activities belonging to WS-A (0 leak).
// Tests both Eloquent global scope (layer 1) and raw SQL + RLS (layer 3).

it('workspace B cannot read workspace A activities via eloquent', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    // Create an activity in WS-A
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    app(ActivityLogger::class)->log($teamA, 'team.created');

    // Now switch to WS-B — WS-A activity must not appear
    actingInWorkspace($wsB);
    expect(Activity::count())->toBe(0);
});

it('workspace B cannot read workspace A activities via raw SQL (RLS layer 3)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    // Create an activity in WS-A
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    app(ActivityLogger::class)->log($teamA, 'team.created');

    // Set context to WS-B and attempt raw query
    setWorkspaceContext($wsB->id);
    $count = DB::table('activities')->count();

    expect($count)->toBe(0, 'RLS should prevent WS-B from seeing WS-A activities');
});

it('activity global scope shows only current workspace activities', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $loggerA = app(ActivityLogger::class);
    $loggerA->log($teamA, 'team.created');
    $loggerA->log($teamA, 'team.updated');

    actingInWorkspace($wsB);
    $teamB = Team::factory()->create();
    $loggerA->log($teamB, 'team.created');

    // WS-B context: only WS-B activity visible
    expect(Activity::count())->toBe(1);

    // WS-A context: only WS-A activities visible
    actingInWorkspace($wsA);
    expect(Activity::count())->toBe(2);
});
