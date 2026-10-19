<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\AbuseReport;
use App\Services\Chat\AbuseReports;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class AbuseReportsController extends Controller
{
    public function store(Request $request, AbuseReports $reports): Response
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(AbuseReport::REPORTABLE))],
            'id' => ['required', 'integer'],
            'reason' => ['required', Rule::in(AbuseReport::REASONS)],
            'note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $reports->report($request->user(), $data['type'], $data['id'], $data['reason'], $data['note'] ?? null);

        return response()->noContent(201);
    }
}
