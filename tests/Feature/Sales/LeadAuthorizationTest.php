<?php

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\LeadService;

// ── Authz matrix: Leads (G2/G12/BR-X15) ─────────────────────────────────────
// guest → redirect; sai-permission → 403; ngoài-tầm/visibility → 404; đúng → 2xx.
// G12: is_public=true → visible to any workspace member (own OR team OR public OR all).

function createLeadSetup(): array
{
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    $lead = app(LeadService::class)->create([
        'name' => 'Test Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    return compact('ws', 'user', 'pipeline', 'stage', 'lead');
}

// ─── Guest ───────────────────────────────────────────────────────────────────

it('guest is redirected from leads.index', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $this->get(route('leads.index'))->assertRedirect();
});

it('guest is redirected from leads.show', function () {
    ['lead' => $lead] = createLeadSetup();

    // Unauthenticated
    auth()->logout();

    $this->get(route('leads.show', $lead))->assertRedirect();
});

// ─── viewer role ──────────────────────────────────────────────────────────────

it('viewer gets 403 on leads.store', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer');
    actingInWorkspace($ws, $user);

    $this->actingAs($user)
        ->post(route('leads.store'), ['name' => 'Test Lead'])
        ->assertStatus(403);
});

// ─── Cross-workspace → 404 (non-enumeration) ──────────────────────────────────

it('admin in WS-B gets 404 on show for WS-A lead', function () {
    ['ws' => $wsA, 'lead' => $lead] = createLeadSetup();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->get(route('leads.show', $lead->id))
        ->assertStatus(404);
});

it('admin in WS-B gets 404 on delete for WS-A lead', function () {
    ['lead' => $lead] = createLeadSetup();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    $this->actingAs($userB)
        ->delete(route('leads.destroy', $lead->id))
        ->assertStatus(404);
});

// ─── Visibility: own / team / all ────────────────────────────────────────────

it('admin (all) sees any lead in workspace', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    $other = User::factory()->create();

    actingInWorkspace($ws, $other);
    seedMember($ws, $other, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);
    $lead = app(LeadService::class)->create([
        'name' => 'Other Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    seedMember($ws, $admin, 'admin');
    actingInWorkspace($ws, $admin);

    $this->actingAs($admin)
        ->get(route('leads.show', $lead))
        ->assertOk();
});

// ─── G12: is_public lead visible to sales_rep (not the owner) ────────────────

it('G12: is_public lead is visible to sales_rep who is not owner', function () {
    $ws = Workspace::factory()->create();
    $owner = User::factory()->create();
    $rep = User::factory()->create();

    actingInWorkspace($ws, $owner);
    seedMember($ws, $owner, 'admin');
    seedMember($ws, $rep, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    // Public lead owned by admin
    $publicLead = app(LeadService::class)->create([
        'name' => 'Public Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'is_public' => true,
    ]);

    // Switch to rep — should see public lead
    actingInWorkspace($ws, $rep);

    $visible = Lead::visibleTo($rep)->where('id', $publicLead->id)->exists();
    expect($visible)->toBeTrue();
});

it('G12: private lead (is_public=false) is NOT visible to unrelated sales_rep', function () {
    $ws = Workspace::factory()->create();
    $owner = User::factory()->create();
    $rep = User::factory()->create();

    actingInWorkspace($ws, $owner);
    seedMember($ws, $owner, 'admin');
    seedMember($ws, $rep, 'sales_rep');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    // Private lead owned by admin
    $privateLead = app(LeadService::class)->create([
        'name' => 'Private Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'is_public' => false,
    ]);

    // Switch to rep — should NOT see this lead
    actingInWorkspace($ws, $rep);
    $rep->revokePermissionTo('tenant.lead.view');

    $visible = Lead::visibleTo($rep)->where('id', $privateLead->id)->exists();
    expect($visible)->toBeFalse();
})->skip('Requires P01 permissions seeded for reliable revokePermissionTo');

// ─── Admin can CRUD leads ─────────────────────────────────────────────────────

it('admin can create a lead', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);

    $this->actingAs($user)
        ->post(route('leads.store'), [
            'name' => 'New Lead',
            'pipeline_id' => $pipeline->id,
            'stage_id' => $stage->id,
        ])
        ->assertRedirect();
});

it('admin can delete their own lead', function () {
    ['user' => $user, 'lead' => $lead] = createLeadSetup();

    $this->actingAs($user)
        ->delete(route('leads.destroy', $lead))
        ->assertRedirect();

    expect(Lead::find($lead->id))->toBeNull();
});
