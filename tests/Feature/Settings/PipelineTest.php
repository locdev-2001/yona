<?php

use Modules\CrmSales\Models\Pipeline;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// Pipeline CRUD + single-default invariant + stage types + non-enumeration.

it('admin can list pipelines', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    Pipeline::factory()->count(2)->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('lookups.pipelines.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/lookups/pipelines'));
});

it('admin can create a pipeline', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.pipelines.store'), ['name' => 'Test Pipeline', 'is_default' => false])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Pipeline::where('name', 'Test Pipeline')->exists())->toBeTrue();
});

it('creating pipeline with is_default=true clears previous default', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $first = Pipeline::factory()->create(['is_default' => true]);
    expect($first->is_default)->toBeTrue();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.pipelines.store'), ['name' => 'New Default', 'is_default' => true])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect($first->refresh()->is_default)->toBeFalse();
    expect(Pipeline::where('is_default', true)->count())->toBe(1);
});

it('admin can update a pipeline name', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $pipeline = Pipeline::factory()->create(['name' => 'Old Name']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->patch(route('lookups.pipelines.update', $pipeline->id), ['name' => 'New Name'])
        ->assertRedirect();

    expect($pipeline->refresh()->name)->toBe('New Name');
});

it('admin can soft-delete a pipeline', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $pipeline = Pipeline::factory()->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('lookups.pipelines.destroy', $pipeline->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Pipeline::find($pipeline->id))->toBeNull();
    expect(Pipeline::withTrashed()->find($pipeline->id))->not->toBeNull();
});

it('pipeline name must be unique per workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    Pipeline::factory()->create(['name' => 'Duplicate']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.pipelines.store'), ['name' => 'Duplicate'])
        ->assertSessionHasErrors(['name']);
});

it('stage type must be valid', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $pipeline = Pipeline::factory()->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.stages.store', $pipeline->id), [
            'name' => 'Bad Stage',
            'type' => 'invalid_type',
        ])
        ->assertSessionHasErrors(['type']);
});

it('returns 404 for pipeline belonging to a foreign workspace — non-enumeration', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $adminA = User::factory()->create();
    $adminB = User::factory()->create();

    // Create pipeline in workspace A
    actingInWorkspace($wsA, $adminA);
    seedMember($wsA, $adminA, 'admin');
    $pipeline = Pipeline::factory()->create();

    // Admin B belongs ONLY to workspace B — global scope hides workspace A pipeline
    actingInWorkspace($wsB, $adminB);
    seedMember($wsB, $adminB, 'admin');

    $this->actingAs($adminB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('lookups.pipelines.destroy', $pipeline->id))
        ->assertNotFound();
});

it('viewer cannot create a pipeline — 403', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.pipelines.store'), ['name' => 'Forbidden'])
        ->assertForbidden();
});
