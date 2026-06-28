<?php

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Services\LeadService;
use App\Models\User;
use App\Models\Workspace;

// ── Route: leads.restore-status must work for soft-deleted leads ──────────────
// Bug: route lacked ->withTrashed() so route-model-binding excluded soft-deleted
// leads → 404. This test verifies the fix: soft-delete a lead then call the
// restore-status route — must NOT return 404.

it('restore-status route resolves a soft-deleted lead without 404', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $service = app(LeadService::class);
    $lead = $service->create([
        'name' => 'Soft-Deleted Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    // Mark lost first so restore has something to clear, then soft-delete.
    $service->markLost($lead);
    $lead->delete();

    expect(Lead::withTrashed()->find($lead->id)?->deleted_at)->not->toBeNull();

    // POST to restore-status: without ->withTrashed() on the route this 404s.
    $response = test()->post(route('leads.restore-status', $lead->id));

    $response->assertRedirect(); // 302 = route resolved, action ran
});
