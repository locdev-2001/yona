<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Services\Chat\AbuseReports;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\AbuseReportDashboard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AbuseReportsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(AbuseReportDashboard::class);
    }

    protected function assign(Model $record, Request $request): void
    {
        $status = array_search((string) data_get($request->input('abuse_report', []), 'status'), AbuseReportDashboard::STATUS_NAMES, true);

        if ($status !== false && $status !== $record->status) {
            app(AbuseReports::class)->resolve($record, $request->user(), $status);
        }
    }
}
