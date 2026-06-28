<?php

namespace App\Http\Controllers\Crm\Leads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\ConvertLeadRequest;
use App\Models\Lead;
use App\Services\LeadConversionService;
use Illuminate\Http\RedirectResponse;

/**
 * P07 — Convert lead to client (POST leads/{lead}/convert).
 * G7 — isolation + idempotency enforced inside LeadConversionService.
 */
class LeadConversionController extends Controller
{
    public function store(ConvertLeadRequest $request, Lead $lead, LeadConversionService $service): RedirectResponse
    {
        $client = $service->convert($lead, $request->validated());

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('leads.flash.converted'));
    }
}
