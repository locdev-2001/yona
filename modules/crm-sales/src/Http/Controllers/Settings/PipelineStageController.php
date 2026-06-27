<?php

namespace Modules\CrmSales\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Modules\CrmSales\Http\Requests\Settings\PipelineStageStoreRequest;
use Modules\CrmSales\Http\Requests\Settings\PipelineStageUpdateRequest;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\CrmSales\Services\LookupService;
use Illuminate\Http\RedirectResponse;

/**
 * Settings → Lookups → Pipeline Stages (admin-only). Nested under pipelines.
 */
class PipelineStageController extends Controller
{
    public function store(PipelineStageStoreRequest $request, Pipeline $pipeline, LookupService $lookup): RedirectResponse
    {
        $this->authorize('update', $pipeline);

        $lookup->createStage($pipeline, $request->only(['name', 'color', 'stage_order', 'probability', 'type']));

        return back()->with('success', __('lookups.pipelines.stage_saved'));
    }

    public function update(PipelineStageUpdateRequest $request, PipelineStage $stage): RedirectResponse
    {
        $this->authorize('update', $stage->pipeline);

        $stage->fill($request->only(['name', 'color', 'stage_order', 'probability', 'type']));
        $stage->save();

        return back()->with('success', __('lookups.pipelines.stage_saved'));
    }

    public function destroy(PipelineStage $stage): RedirectResponse
    {
        $this->authorize('update', $stage->pipeline);

        app(LookupService::class)->deleteStage($stage);

        return back()->with('success', __('lookups.pipelines.stage_deleted'));
    }
}

