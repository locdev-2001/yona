<?php

use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceSequence;

// Per-workspace human-readable counters (arch §9c). Atomic via
// INSERT … ON CONFLICT DO UPDATE … RETURNING.

it('returns sequential values per entity', function () {
    actingInWorkspace(Workspace::factory()->create());

    expect(WorkspaceSequence::next('deal'))->toBe(1)
        ->and(WorkspaceSequence::next('deal'))->toBe(2)
        ->and(WorkspaceSequence::next('deal'))->toBe(3)
        ->and(WorkspaceSequence::next('ticket'))->toBe(1); // independent counter
});

it('isolates counters per workspace', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    WorkspaceSequence::next('deal');
    WorkspaceSequence::next('deal'); // a → 2

    actingInWorkspace($b);
    expect(WorkspaceSequence::next('deal'))->toBe(1); // b starts fresh
});

it('requires a workspace context', function () {
    clearWorkspaceContext();
    app()->forgetInstance('currentWorkspace');

    expect(fn () => WorkspaceSequence::next('deal'))->toThrow(RuntimeException::class);
});
