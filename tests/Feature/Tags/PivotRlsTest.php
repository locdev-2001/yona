<?php

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Identity\Models\Team;
use Modules\Shared\Models\Tag;
use Modules\Shared\Services\TagService;
use Modules\Tenancy\Models\Workspace;

// G4 — PivotRlsTest: taggables pivot must be RLS-protected at the DB layer.
// Raw query (bypass Eloquent global scope) cross-workspace → 0 rows.

it('RLS blocks raw query on taggables when context is a different workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $team = Team::factory()->create();
    $service = app(TagService::class);
    $service->sync($team, ['PivotTag']);

    // Confirm row exists in WS-A context.
    expect(DB::table('taggables')->count())->toBeGreaterThan(0);

    // Switch to WS-B — RLS default-deny must hide WS-A rows.
    setWorkspaceContext($wsB->id);
    expect(DB::table('taggables')->count())->toBe(0);
});

it('RLS blocks raw query on taggables when context is cleared (default-deny)', function () {
    $wsA = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $team = Team::factory()->create();
    $service = app(TagService::class);
    $service->sync($team, ['PivotTag2']);

    clearWorkspaceContext();
    expect(DB::table('taggables')->count())->toBe(0);
});

it('RLS blocks inserting taggables row with mismatched workspace_id', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $tag = Tag::factory()->create();

    // Set context to WS-A, attempt insert with WS-B workspace_id → WITH CHECK violation.
    setWorkspaceContext($wsA->id);

    expect(fn () => DB::table('taggables')->insert([
        'id' => (string) Str::uuid(),
        'workspace_id' => $wsB->id, // mismatched
        'tag_id' => $tag->id,
        'taggable_type' => 'team',
        'taggable_id' => (string) Str::uuid(),
        'order' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});
