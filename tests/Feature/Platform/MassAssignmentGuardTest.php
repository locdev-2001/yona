<?php

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Eloquent\MassAssignmentException;

// BR-X12: workspace_id / owner_id / team_id / role / is_internal are
// server-controlled and must never be settable via mass assignment.

it('ignores a smuggled workspace_id on Team and stamps the active one', function () {
    $a = Workspace::factory()->create();
    $b = Workspace::factory()->create();

    actingInWorkspace($a);
    $team = Team::create(['name' => 'X', 'workspace_id' => $b->id]);

    expect($team->workspace_id)->toBe($a->id);
});

it('refuses to mass-assign any guarded membership field', function () {
    // WorkspaceMember is totally guarded — attempting to mass-assign a
    // server-controlled field throws rather than silently dropping it.
    expect(fn () => (new WorkspaceMember)->fill(['role' => 'admin']))
        ->toThrow(MassAssignmentException::class);
});

it('does not mass-assign user status or is_internal', function () {
    $user = (new User)->fill([
        'name' => 'Mallory',
        'email' => 'mallory@example.com',
        'password' => 'secret',
        'status' => 'locked',
        'is_internal' => true,
    ]);

    expect($user->getAttribute('status'))->toBeNull()
        ->and($user->getAttribute('is_internal'))->toBeNull();
});
