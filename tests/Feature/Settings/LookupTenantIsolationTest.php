<?php

use Modules\CrmSales\Models\LeadSource;
use Modules\CrmSales\Models\Pipeline;
use App\Models\ProjectStatus;
use Modules\CrmSales\Services\LookupService;
use Modules\Tenancy\Models\Workspace;

// Two-workspace isolation: verify 0 cross-workspace leak for lookup tables.

beforeEach(function () {
    $this->workspaceA = Workspace::factory()->create();
    $this->workspaceB = Workspace::factory()->create();
});

it('pipelines scoped to workspace A are not visible in workspace B', function () {
    actingInWorkspace($this->workspaceA);
    Pipeline::factory()->count(3)->create();

    actingInWorkspace($this->workspaceB);
    expect(Pipeline::count())->toBe(0);
});

it('lead sources scoped to workspace A are not visible in workspace B', function () {
    actingInWorkspace($this->workspaceA);
    LeadSource::factory()->count(2)->create();

    actingInWorkspace($this->workspaceB);
    expect(LeadSource::count())->toBe(0);
});

it('project statuses scoped to workspace A are not visible in workspace B', function () {
    actingInWorkspace($this->workspaceA);
    ProjectStatus::factory()->count(4)->create();

    actingInWorkspace($this->workspaceB);
    expect(ProjectStatus::count())->toBe(0);
});

it('seedDefaults isolates defaults per workspace — no cross-leak', function () {
    actingInWorkspace($this->workspaceA);
    app(LookupService::class)->seedDefaults($this->workspaceA);

    actingInWorkspace($this->workspaceB);
    app(LookupService::class)->seedDefaults($this->workspaceB);

    actingInWorkspace($this->workspaceA);
    $countA = Pipeline::count();

    actingInWorkspace($this->workspaceB);
    $countB = Pipeline::count();

    expect($countA)->toBe(1)
        ->and($countB)->toBe(1);
});

it('Eloquent global scope hides pipeline from another workspace context', function () {
    // Create pipeline in workspace A context.
    actingInWorkspace($this->workspaceA);
    $pipeline = Pipeline::factory()->create();

    // Switch app-layer context to workspace B — BelongsToWorkspace global scope
    // filters queries to workspace B, so workspace A pipeline is invisible.
    actingInWorkspace($this->workspaceB);

    // Eloquent (layer 1): cannot find by ID
    expect(Pipeline::find($pipeline->id))->toBeNull();

    // Also invisible without explicit ID — count is 0
    expect(Pipeline::count())->toBe(0);
});
