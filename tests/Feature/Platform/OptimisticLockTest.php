<?php

use App\Exceptions\StaleModelException;
use App\Models\Team;
use App\Models\Workspace;
use App\Services\TeamService;

// Optimistic concurrency (BR-X08): stale writes are rejected, not silently
// applied (no last-write-wins).

beforeEach(function () {
    actingInWorkspace(Workspace::factory()->create());
    $this->svc = app(TeamService::class);
});

it('increments lock_version on each update', function () {
    $team = $this->svc->create('Root');
    expect($team->lock_version)->toBe(0);

    $team->name = 'A';
    $team->save();

    expect($team->fresh()->lock_version)->toBe(1);
});

it('rejects a stale update from a concurrently-modified copy', function () {
    $team = $this->svc->create('Root');

    $first = Team::find($team->id);
    $second = Team::find($team->id); // both read at lock_version 0

    $first->name = 'First';
    $first->save(); // 0 → 1

    $second->name = 'Second';
    expect(fn () => $second->save())->toThrow(StaleModelException::class);

    // the winning write stands
    expect($team->fresh()->name)->toBe('First');
});
