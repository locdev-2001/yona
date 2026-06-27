<?php

use Illuminate\Support\Facades\DB;
use Modules\Identity\Models\Team;
use Modules\Shared\Models\Tag;
use Modules\Shared\Services\TagService;
use Modules\Tenancy\Models\Workspace;

// Tenant isolation for tags + taggables.

it('scopes tag reads to the active workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    Tag::factory()->count(3)->create();

    actingInWorkspace($wsB);
    expect(Tag::count())->toBe(0);
});

it('blocks raw query on tags cross-workspace via RLS', function () {
    $wsA = Workspace::factory()->create();

    actingInWorkspace($wsA);
    Tag::factory()->count(2)->create();

    clearWorkspaceContext();
    expect(DB::table('tags')->count())->toBe(0);
});

it('deduplicates tags by slug per workspace', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $team = Team::factory()->create();

    /** @var TagService $service */
    $service = app(TagService::class);

    // 'Hot' and 'hot' produce the same slug — should create only one Tag row.
    $service->sync($team, ['Hot', 'hot']);

    expect(Tag::count())->toBe(1);
    expect($team->tags()->count())->toBe(1);
});

it('sync replaces tags and updates order', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $team = Team::factory()->create();

    /** @var TagService $service */
    $service = app(TagService::class);
    $service->sync($team, ['Alpha', 'Beta', 'Gamma']);

    expect($team->tags()->count())->toBe(3);

    // Sync with different set — Gamma removed, Delta added.
    $service->sync($team, ['Alpha', 'Delta']);
    $team->refresh();

    $names = $team->tags()->pluck('name')->toArray();
    expect($names)->toContain('Alpha');
    expect($names)->toContain('Delta');
    expect($names)->not->toContain('Gamma');
    expect($team->tags()->count())->toBe(2);
});

it('tags from workspace A not visible from workspace B', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(TagService::class);
    $service->sync($teamA, ['TagInA']);

    actingInWorkspace($wsB);
    expect(Tag::count())->toBe(0);
    expect(DB::table('taggables')->count())->toBe(0); // RLS on pivot
});
