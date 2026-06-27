<?php

namespace Modules\CrmSales\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use Modules\CrmSales\Models\Lead;
use Modules\CrmSales\Services\LeadService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * P07 — Toggle lost/junk status and restore (lean action controller).
 * All logic delegated to LeadService.
 */
class LeadStatusActionController extends Controller
{
    public function markLost(Request $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $this->authorize('update', $lead);

        $service->markLost($lead);

        return back()->with('success', __('leads.flash.marked_lost'));
    }

    public function markJunk(Request $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $this->authorize('update', $lead);

        $service->markJunk($lead);

        return back()->with('success', __('leads.flash.marked_junk'));
    }

    public function restore(Request $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $this->authorize('update', $lead);

        $service->restore($lead);

        return back()->with('success', __('leads.flash.restored'));
    }
}

