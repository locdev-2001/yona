<?php

namespace App\Http\Controllers\WebApi\Reports;

use App\Http\Controllers\Controller;
use App\Models\AccountUser;
use App\Policies\ReportPolicy;
use Illuminate\Http\Request;

// `before_action :check_authorization` + `authorize :report, :view?` của cả ba
// controller báo cáo.
abstract class BaseReportsController extends Controller
{
    protected function authorizeReportView(Request $request): AccountUser
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless(
            $accountUser instanceof AccountUser && (new ReportPolicy($accountUser))->view(),
            401,
            'You are not authorized to do this action'
        );

        return $accountUser;
    }
}
