<?php

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Workspace;
use App\Services\LookupService;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

uses(TestCase::class, DatabaseTransactions::class);

beforeEach(function () {
    $this->workspace = Workspace::factory()->create();
    actingInWorkspace($this->workspace);
    $this->service = app(LookupService::class);
});

it('seedDefaults creates exactly one default pipeline', function () {
    $this->service->seedDefaults($this->workspace);

    expect(Pipeline::where('is_default', true)->count())->toBe(1)
        ->and(Pipeline::count())->toBe(1);
});

it('seedDefaults creates stages of all 3 types: open, won, lost', function () {
    $this->service->seedDefaults($this->workspace);

    $pipeline = Pipeline::first();
    $types = PipelineStage::where('pipeline_id', $pipeline->id)->pluck('type')->sort()->values()->toArray();

    expect($types)->toBe(['lost', 'open', 'won']);
});

it('seedDefaults stores default_pipeline_id in workspace_settings', function () {
    $this->service->seedDefaults($this->workspace);

    $pipeline = Pipeline::where('is_default', true)->first();
    $stored = app(SettingsService::class)->get('default_pipeline_id');

    expect($stored)->toBe($pipeline->id);
});

it('seedDefaults stores default_lead_source_id and default_project_status_id', function () {
    $this->service->seedDefaults($this->workspace);

    expect(app(SettingsService::class)->get('default_lead_source_id'))->not->toBeNull()
        ->and(app(SettingsService::class)->get('default_project_status_id'))->not->toBeNull();
});

it('createPipeline with is_default=true clears the previous default', function () {
    $first = $this->service->createPipeline('First', isDefault: true);
    expect($first->is_default)->toBeTrue();

    $second = $this->service->createPipeline('Second', isDefault: true);
    expect($first->refresh()->is_default)->toBeFalse()
        ->and($second->is_default)->toBeTrue()
        ->and(Pipeline::where('is_default', true)->count())->toBe(1);
});

it('defaultPipeline() returns the pipeline marked is_default', function () {
    $this->service->seedDefaults($this->workspace);

    $default = $this->service->defaultPipeline();
    expect($default)->not->toBeNull()
        ->and($default->is_default)->toBeTrue();
});

it('reorderStages updates stage_order correctly', function () {
    $pipeline = $this->service->createPipeline('Pipe');
    $s1 = $this->service->createStage($pipeline, ['name' => 'A', 'type' => 'open', 'stage_order' => 0]);
    $s2 = $this->service->createStage($pipeline, ['name' => 'B', 'type' => 'open', 'stage_order' => 1]);

    $this->service->reorderStages($pipeline, [$s2->id, $s1->id]);

    expect($s2->refresh()->stage_order)->toBe(0)
        ->and($s1->refresh()->stage_order)->toBe(1);
});

it('deleteStage soft-deletes the stage', function () {
    $pipeline = $this->service->createPipeline('P');
    $stage = $this->service->createStage($pipeline, ['name' => 'S', 'type' => 'open', 'stage_order' => 0]);

    $this->service->deleteStage($stage);

    expect(PipelineStage::find($stage->id))->toBeNull()
        ->and(PipelineStage::withTrashed()->find($stage->id))->not->toBeNull();
});
