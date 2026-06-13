<?php

use App\Models\Team;
use App\Models\Workspace;

// Layer 1 (BelongsToWorkspace global scope) — BR-X01/X11.

it('scopes reads to the active workspace with zero cross-workspace leak', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Team::factory()->count(3)->create();

    actingInWorkspace($b);
    Team::factory()->count(2)->create();

    actingInWorkspace($a);
    expect(Team::count())->toBe(3);

    actingInWorkspace($b);
    expect(Team::count())->toBe(2);
});

it('auto-stamps workspace_id from the active workspace on create', function () {
    $a = Workspace::factory()->create();

    actingInWorkspace($a);
    $team = Team::factory()->create();

    expect($team->workspace_id)->toBe($a->id);
});

it('cannot resolve another workspace record by id — global scope AND RLS hide it', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    $teamA = Team::factory()->create();

    actingInWorkspace($b);
    expect(Team::find($teamA->id))->toBeNull();                          // layer 1
    expect(Team::withoutGlobalScopes()->find($teamA->id))->toBeNull();   // layer 3 (RLS) still denies
});
