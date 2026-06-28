<?php

namespace App\Http\Controllers\Crm\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\LeadSourceStoreRequest;
use App\Http\Requests\Settings\LeadSourceUpdateRequest;
use App\Models\LeadSource;
use App\Services\LookupService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Settings → Lookups → Lead Sources (admin-only).
 */
class LeadSourceController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', LeadSource::class);

        $sources = LeadSource::orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (LeadSource $source) => [
                'id' => $source->id,
                'name' => $source->name,
            ]);

        return Inertia::render('settings/lookups/lead-sources', [
            'sources' => $sources,
        ]);
    }

    public function store(LeadSourceStoreRequest $request, LookupService $lookup): RedirectResponse
    {
        $lookup->createSource($request->string('name')->toString());

        return back()->with('success', __('lookups.lead_sources.saved'));
    }

    public function update(LeadSourceUpdateRequest $request, LeadSource $leadSource): RedirectResponse
    {
        $this->authorize('update', $leadSource);

        $leadSource->name = $request->string('name')->toString();
        $leadSource->save();

        return back()->with('success', __('lookups.lead_sources.saved'));
    }

    public function destroy(LeadSource $leadSource): RedirectResponse
    {
        $this->authorize('delete', $leadSource);

        app(LookupService::class)->deleteSource($leadSource);

        return back()->with('success', __('lookups.lead_sources.deleted'));
    }
}

