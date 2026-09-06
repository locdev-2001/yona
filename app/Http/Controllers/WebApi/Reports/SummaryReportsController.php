<?php

namespace App\Http\Controllers\WebApi\Reports;

use App\Builders\Reports\AgentSummaryBuilder;
use App\Builders\Reports\ChannelSummaryBuilder;
use App\Builders\Reports\InboxSummaryBuilder;
use App\Builders\Reports\LabelSummaryBuilder;
use App\Builders\Reports\TeamSummaryBuilder;
use App\Models\Account;
use App\Services\Reports\ReportScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V2::Accounts::SummaryReportsController — bảng tổng hợp theo chiều.
class SummaryReportsController extends BaseReportsController
{
    private const MAX_CHANNEL_RANGE_SECONDS = 15778476;

    public function agent(Request $request, Account $account): JsonResponse
    {
        return $this->render($request, new AgentSummaryBuilder($account, $this->builderParams($request, ReportScope::TYPE_AGENT)));
    }

    public function team(Request $request, Account $account): JsonResponse
    {
        return $this->render($request, new TeamSummaryBuilder($account, $this->builderParams($request, ReportScope::TYPE_TEAM)));
    }

    public function inbox(Request $request, Account $account): JsonResponse
    {
        return $this->render($request, new InboxSummaryBuilder($account, $this->builderParams($request, ReportScope::TYPE_INBOX)));
    }

    public function label(Request $request, Account $account): JsonResponse
    {
        return $this->render($request, new LabelSummaryBuilder($account, $this->builderParams($request)));
    }

    public function channel(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        if ($this->dateRangeTooLong($request)) {
            return response()->json(['error' => __('errors.reports.date_range_too_long')], 422);
        }

        return response()->json((new ChannelSummaryBuilder($account, $this->builderParams($request)))->build());
    }

    private function render(Request $request, object $builder): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json($builder->build());
    }

    /** @return array<string, mixed> */
    private function builderParams(Request $request, ?string $type = null): array
    {
        $params = [
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'business_hours' => filter_var($request->query('business_hours'), FILTER_VALIDATE_BOOLEAN),
        ];

        return $type === null ? $params : [...$params, 'type' => $type];
    }

    private function dateRangeTooLong(Request $request): bool
    {
        $since = $request->query('since');
        $until = $request->query('until');

        if (blank($since) || blank($until)) {
            return false;
        }

        return ((int) $until - (int) $since) > self::MAX_CHANNEL_RANGE_SECONDS;
    }
}
