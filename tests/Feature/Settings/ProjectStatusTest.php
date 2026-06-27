<?php

use App\Models\ProjectStatus;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;

it('admin can list project statuses', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    ProjectStatus::factory()->count(3)->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('lookups.project-statuses.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/lookups/project-statuses'));
});

it('admin can create a project status', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.project-statuses.store'), [
            'name' => 'In Review',
            'color' => '#f59e0b',
            'status_order' => 1,
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(ProjectStatus::where('name', 'In Review')->exists())->toBeTrue();
});

it('project status name must be unique per workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    ProjectStatus::factory()->create(['name' => 'Completed']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.project-statuses.store'), ['name' => 'Completed'])
        ->assertSessionHasErrors(['name']);
});

it('admin can update a project status', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $status = ProjectStatus::factory()->create(['name' => 'Old Status', 'color' => '#000000']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->patch(route('lookups.project-statuses.update', $status->id), [
            'name' => 'Updated Status',
            'color' => '#ffffff',
        ])
        ->assertRedirect();

    expect($status->refresh()->name)->toBe('Updated Status')
        ->and($status->refresh()->color)->toBe('#ffffff');
});

it('admin can soft-delete a project status', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $status = ProjectStatus::factory()->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('lookups.project-statuses.destroy', $status->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(ProjectStatus::find($status->id))->toBeNull();
});

it('returns 404 for project status from a foreign workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $adminA = User::factory()->create();
    $adminB = User::factory()->create();

    actingInWorkspace($wsA, $adminA);
    seedMember($wsA, $adminA, 'admin');
    $status = ProjectStatus::factory()->create();

    actingInWorkspace($wsB, $adminB);
    seedMember($wsB, $adminB, 'admin');

    $this->actingAs($adminB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('lookups.project-statuses.destroy', $status->id))
        ->assertNotFound();
});

it('viewer cannot create a project status — 403', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.project-statuses.store'), ['name' => 'Forbidden'])
        ->assertForbidden();
});
