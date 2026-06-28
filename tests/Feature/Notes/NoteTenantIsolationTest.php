<?php

use Illuminate\Support\Facades\DB;
use App\Models\Team;
use App\Models\Note;
use App\Services\NoteService;
use App\Models\Workspace;

// Tenant isolation for notes.

it('scopes note reads to the active workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(NoteService::class);
    $service->add($teamA, 'Note in A');
    $service->add($teamA, 'Note in A 2');

    actingInWorkspace($wsB);
    expect(Note::count())->toBe(0);
});

it('blocks raw query cross-workspace via RLS', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(NoteService::class);
    $service->add($teamA, 'Private note');

    clearWorkspaceContext();
    expect(DB::table('notes')->count())->toBe(0);
});

it('stores date_contacted', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $service = app(NoteService::class);
    $note = $service->add($teamA, 'Contacted today', '2026-06-25');

    expect($note->date_contacted?->format('Y-m-d'))->toBe('2026-06-25');
});

it('update changes body and date_contacted', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $service = app(NoteService::class);
    $note = $service->add($teamA, 'Original body', '2026-01-01');
    $service->update($note, 'Updated body', '2026-06-01');

    $note->refresh();
    expect($note->body)->toBe('Updated body');
    expect($note->date_contacted?->format('Y-m-d'))->toBe('2026-06-01');
});

it('soft-deletes note on delete', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $service = app(NoteService::class);
    $note = $service->add($teamA, 'To delete');
    $service->delete($note);

    expect(Note::count())->toBe(0);
    expect(Note::withTrashed()->count())->toBe(1);
});
