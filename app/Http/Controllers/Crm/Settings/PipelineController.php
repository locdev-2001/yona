<?php

namespace App\Http\Controllers\Crm\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PipelineStoreRequest;
use App\Http\Requests\Settings\PipelineUpdateRequest;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Services\LookupService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Lookups → Pipelines (admin-only). Thin controller: parse input
 * → delegate to LookupService → return Inertia/redirect.
 * workspace_id always from currentWorkspace() — never from request (BR-X14).
 */
class PipelineController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', Pipeline::class);

        $pipelines = Pipeline::with('stages')
            ->orderBy('name')
            ->get()
            ->map(function (Pipeline $pipeline): array {
                $stages = $pipeline->stages->map(function (PipelineStage $stage): array {
                    return [
                        'id' => $stage->id,
                        'name' => $stage->name,
                        'color' => $stage->color,
                        'stage_order' => $stage->stage_order,
                        'probability' => $stage->probability,
                        'type' => $stage->type,
                    ];
                })->values()->all();

                return [
                    'id' => $pipeline->id,
                    'name' => $pipeline->name,
                    'is_default' => $pipeline->is_default,
                    'stages' => $stages,
                ];
            })->values()->all();

        return Inertia::render('settings/lookups/pipelines', [
            'pipelines' => $pipelines,
            'stageTypes' => PipelineStage::STAGE_TYPES,
        ]);
    }

    public function store(PipelineStoreRequest $request, LookupService $lookup): RedirectResponse
    {
        $lookup->createPipeline(
            $request->string('name')->toString(),
            $request->boolean('is_default'),
        );

        return back()->with('success', __('lookups.pipelines.saved'));
    }

    public function update(PipelineUpdateRequest $request, Pipeline $pipeline, LookupService $lookup): RedirectResponse
    {
        $this->authorize('update', $pipeline);

        if ($request->boolean('is_default') && ! $pipeline->is_default) {
            Pipeline::where('is_default', true)->update(['is_default' => false]);
            $pipeline->is_default = true;
            app(LookupService::class); // ensure settings updated
        }

        $pipeline->name = $request->string('name')->toString();
        if ($request->has('is_default')) {
            $pipeline->is_default = $request->boolean('is_default');
        }
        $pipeline->save();

        return back()->with('success', __('lookups.pipelines.saved'));
    }

    public function destroy(Pipeline $pipeline): RedirectResponse
    {
        $this->authorize('delete', $pipeline);

        $pipeline->delete();

        return back()->with('success', __('lookups.pipelines.deleted'));
    }
}
