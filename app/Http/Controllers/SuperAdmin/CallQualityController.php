<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Call;
use App\Services\Calls\Telemetry\CallQualityReport;
use App\Support\SuperAdminArea;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class CallQualityController extends Controller
{
    public function index(Request $request, CallQualityReport $report): Response
    {
        $filters = $request->validate(['days' => ['sometimes', 'integer', 'between:1,90'], 'kind' => ['nullable', Rule::in(array_keys(config('calls.kinds')))]]);
        $days = (int) ($filters['days'] ?? 7);
        $kind = $filters['kind'] ?? null;

        return Inertia::render('superadmin/CallQuality', [...$report->summary($days, $kind), 'days' => $days, 'kind' => $kind, 'kinds' => array_keys(config('calls.kinds')), 'baseUrl' => SuperAdminArea::url('call_quality')]);
    }

    public function show(Call $call, CallQualityReport $report): Response
    {
        return Inertia::render('superadmin/CallQualityTimeline', [...$report->timeline($call->id), 'call' => $call->only(['id', 'kind', 'status', 'media', 'started_at', 'answered_at', 'ended_at']), 'backUrl' => SuperAdminArea::url('call_quality')]);
    }
}
