<?php

use App\Models\Note;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Services\NoteService;

// Authz matrix for NoteController.

it('guest cannot post a note (401)', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $team = Team::factory()->create();

    $this->post(route('notes.store'), [
        'noteable_type' => 'team',
        'noteable_id' => $team->id,
        'body' => 'Hello',
    ])->assertRedirect(route('login'));
});

it('authenticated member can post a note', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');

    actingInWorkspace($ws);
    $team = Team::factory()->create();

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('notes.store'), [
            'noteable_type' => 'team',
            'noteable_id' => $team->id,
            'body' => 'My note',
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Note::where('body', 'My note')->exists())->toBeTrue();
});

it('non-author cannot delete another member\'s note (403)', function () {
    $ws = Workspace::factory()->create();
    $author = User::factory()->create();
    $other = User::factory()->create();
    seedMember($ws, $author, 'sales_rep');
    seedMember($ws, $other, 'sales_rep');

    actingInWorkspace($ws);
    $team = Team::factory()->create();
    $service = app(NoteService::class);
    $note = $service->add($team, 'Author note');
    $note->user_id = $author->id;
    $note->saveQuietly();

    $this->actingAs($other)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('notes.destroy', $note->id))
        ->assertForbidden();
});

it('author can delete their own note', function () {
    $ws = Workspace::factory()->create();
    $author = User::factory()->create();
    seedMember($ws, $author, 'sales_rep');

    actingInWorkspace($ws, $author);
    $team = Team::factory()->create();
    $service = app(NoteService::class);
    $note = $service->add($team, 'My note');

    $this->actingAs($author)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('notes.destroy', $note->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Note::find($note->id))->toBeNull();
});

it('note id from different workspace returns 404', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    seedMember($wsB, $userB, 'admin');

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(NoteService::class);
    $note = $service->add($teamA, 'WS-A note');

    $this->actingAs($userB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('notes.destroy', $note->id))
        ->assertNotFound();
});
