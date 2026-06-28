<?php

use App\Models\LeadSource;
use App\Models\User;
use App\Models\Workspace;

it('admin can list lead sources', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    LeadSource::factory()->count(3)->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('lookups.lead-sources.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/lookups/lead-sources'));
});

it('admin can create a lead source', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.lead-sources.store'), ['name' => 'Referral'])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(LeadSource::where('name', 'Referral')->exists())->toBeTrue();
});

it('lead source name must be unique per workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    LeadSource::factory()->create(['name' => 'Website']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.lead-sources.store'), ['name' => 'Website'])
        ->assertSessionHasErrors(['name']);
});

it('admin can update a lead source', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $source = LeadSource::factory()->create(['name' => 'Old Source']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->patch(route('lookups.lead-sources.update', $source->id), ['name' => 'New Source'])
        ->assertRedirect();

    expect($source->refresh()->name)->toBe('New Source');
});

it('admin can soft-delete a lead source', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $source = LeadSource::factory()->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('lookups.lead-sources.destroy', $source->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(LeadSource::find($source->id))->toBeNull();
});

it('returns 404 for lead source from a foreign workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $adminA = User::factory()->create();
    $adminB = User::factory()->create();

    actingInWorkspace($wsA, $adminA);
    seedMember($wsA, $adminA, 'admin');
    $source = LeadSource::factory()->create();

    actingInWorkspace($wsB, $adminB);
    seedMember($wsB, $adminB, 'admin');

    $this->actingAs($adminB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('lookups.lead-sources.destroy', $source->id))
        ->assertNotFound();
});

it('viewer cannot create a lead source — 403', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('lookups.lead-sources.store'), ['name' => 'Forbidden'])
        ->assertForbidden();
});
