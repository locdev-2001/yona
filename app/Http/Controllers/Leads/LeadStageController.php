<?php

namespace App\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Leads\MoveLeadStageRequest;
use App\Models\Lead;
use App\Services\LeadService;
use Illuminate\Http\RedirectResponse;

/**
 * P07 — Kanban stage move (PATCH leads/{lead}/stage).
 * G8 — stage must belong to the lead's current pipeline (FormRequest validates).
 */
class LeadStageController extends Controller
{
    public function update(MoveLeadStageRequest $request, Lead $lead, LeadService $service): RedirectResponse
    {
        $validated = $request->validated();

        $service->moveStage($lead, $validated['stage_id'], (int) $validated['order']);

        return back()->with('success', __('leads.flash.stage_moved'));
    }
}
