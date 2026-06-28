<?php

use App\Models\Team;
use App\Models\Workspace;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// Layer 3 (Postgres RLS) proven independent of Eloquent — raw query builder
// bypasses the global scope entirely, yet still cannot cross workspaces. BR-X18.

it('default-denies raw queries when no tenant context is set', function () {
    $a = Workspace::factory()->create();
    actingInWorkspace($a);
    Team::factory()->count(2)->create();

    clearWorkspaceContext();

    expect(DB::table('teams')->count())->toBe(0);
});

it('default-denies raw queries scoped to a different workspace', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    Team::factory()->count(2)->create();

    setWorkspaceContext($b->id);
    expect(DB::table('teams')->count())->toBe(0);

    setWorkspaceContext($a->id);
    expect(DB::table('teams')->count())->toBe(2);
});

it('blocks inserting a row for a workspace other than the active context (WITH CHECK)', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    setWorkspaceContext($a->id);

    expect(fn () => DB::table('teams')->insert([
        'id' => '99999999-9999-9999-9999-999999999999',
        'workspace_id' => $b->id, // mismatched — RLS WITH CHECK must reject
        'name' => 'Smuggled',
        'lock_version' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);
});
