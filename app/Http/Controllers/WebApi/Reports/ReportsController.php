<?php

namespace App\Http\Controllers\WebApi\Reports;

use App\Builders\Reports\AgentSummaryBuilder;
use App\Builders\Reports\BotMetricsBuilder;
use App\Builders\Reports\ConversationsMetricBuilder;
use App\Builders\Reports\DrilldownBuilder;
use App\Builders\Reports\FirstResponseTimeDistributionBuilder;
use App\Builders\Reports\InboxLabelMatrixBuilder;
use App\Builders\Reports\InboxSummaryBuilder;
use App\Builders\Reports\LabelSummaryBuilder;
use App\Builders\Reports\LiveConversationsBuilder;
use App\Builders\Reports\OutgoingMessagesCountBuilder;
use App\Builders\Reports\TeamSummaryBuilder;
use App\Builders\Reports\TimeseriesReportBuilder;
use App\Models\Account;
use App\Services\Reports\ConversationTrafficReport;
use App\Services\Reports\CsvWriter;
use App\Services\Reports\DrilldownTimestampValidator;
use App\Services\Reports\ReportMetricRegistry;
use App\Services\Reports\ReportScope;
use App\Services\Reports\TimeFormatPresenter;
use App\Services\Reports\TimezoneResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Port từ Api::V2::Accounts::ReportsController (+ ReportsHelper, HeatmapHelper).
// Bỏ `year_in_review` (EE/marketing) theo phạm vi đợt D2.
class ReportsController extends BaseReportsController
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json((new TimeseriesReportBuilder($account, $this->reportParams($request)))->timeseries());
    }

    public function summary(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json($this->buildSummary($request, $account, 'summary'));
    }

    public function botSummary(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json($this->buildSummary($request, $account, 'botSummary'));
    }

    public function conversations(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        if (blank($request->query('type'))) {
            return response()->json(null, 422);
        }

        $metrics = (new LiveConversationsBuilder($account, [
            'type' => (string) $request->query('type'),
            'user_id' => $request->query('user_id'),
            'page' => $request->query('page') ?: 1,
        ]))->build();

        return response()->json($metrics);
    }

    public function botMetrics(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json((new BotMetricsBuilder($account, $request->query()))->metrics());
    }

    public function drilldown(Request $request, Account $account): JsonResponse
    {
        $accountUser = $this->authorizeReportView($request);

        if (! $accountUser->isAdministrator()) {
            return response()->json(null, 401);
        }

        $params = $this->drilldownParams($request);

        if (! $this->validDrilldownParams($params)) {
            return response()->json(null, 422);
        }

        return response()->json((new DrilldownBuilder($account, $params))->build());
    }

    public function inboxLabelMatrix(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json((new InboxLabelMatrixBuilder($account, [
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'inbox_ids' => $request->query('inbox_ids'),
            'label_ids' => $request->query('label_ids'),
        ]))->build());
    }

    public function firstResponseTimeDistribution(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);

        return response()->json((new FirstResponseTimeDistributionBuilder($account, [
            'since' => $request->query('since'),
            'until' => $request->query('until'),
        ]))->build());
    }

    public function outgoingMessagesCount(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);
        $groupBy = (string) $request->query('group_by');

        if (! in_array($groupBy, OutgoingMessagesCountBuilder::ALLOWED_GROUP_BY, true)) {
            return response()->json(null, 422);
        }

        return response()->json((new OutgoingMessagesCountBuilder($account, [
            'group_by' => $groupBy,
            'since' => $request->query('since'),
            'until' => $request->query('until'),
        ]))->build());
    }

    public function agents(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);
        $reports = collect((new AgentSummaryBuilder($account, $this->csvParams($request, ReportScope::TYPE_AGENT)))->build())
            ->keyBy('id');

        $rows = $account->users()->get()
            ->map(fn ($agent) => [$agent->name, ...$this->readableMetrics($reports[$agent->id] ?? [])])
            ->all();

        return $this->csv($request, 'agents_report', [
            __('reports.agent_csv.agent_name'),
            __('reports.agent_csv.conversations_count'),
            __('reports.agent_csv.avg_first_response_time'),
            __('reports.agent_csv.avg_resolution_time'),
            __('reports.agent_csv.avg_customer_waiting_time'),
            __('reports.agent_csv.resolution_count'),
        ], $rows);
    }

    public function inboxes(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);
        $reports = collect((new InboxSummaryBuilder($account, $this->csvParams($request, ReportScope::TYPE_INBOX)))->build())
            ->keyBy('id');

        $rows = $account->inboxes()->get()
            ->map(fn ($inbox) => [$inbox->name, $inbox->inboxType(), ...$this->readableMetrics($reports[$inbox->id] ?? [])])
            ->all();

        return $this->csv($request, 'inboxes_report', [
            __('reports.inbox_csv.inbox_name'),
            __('reports.inbox_csv.inbox_type'),
            __('reports.inbox_csv.conversations_count'),
            __('reports.inbox_csv.avg_first_response_time'),
            __('reports.inbox_csv.avg_resolution_time'),
        ], $rows);
    }

    public function teams(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);
        $reports = collect((new TeamSummaryBuilder($account, $this->csvParams($request, ReportScope::TYPE_TEAM)))->build())
            ->keyBy('id');

        $rows = $account->teams()->get()
            ->map(fn ($team) => [$team->name, ...$this->readableMetrics($reports[$team->id] ?? [])])
            ->all();

        return $this->csv($request, 'teams_report', [
            __('reports.team_csv.team_name'),
            __('reports.team_csv.conversations_count'),
            __('reports.team_csv.avg_first_response_time'),
            __('reports.team_csv.avg_resolution_time'),
            __('reports.team_csv.avg_customer_waiting_time'),
            __('reports.team_csv.resolution_count'),
        ], $rows);
    }

    public function labels(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);

        $rows = array_map(
            fn (array $report) => [$report['name'], ...$this->readableMetrics($report)],
            (new LabelSummaryBuilder($account, $this->csvParams($request)))->build(),
        );

        return $this->csv($request, 'labels_report', [
            __('reports.label_csv.label_title'),
            __('reports.label_csv.conversations_count'),
            __('reports.label_csv.avg_first_response_time'),
            __('reports.label_csv.avg_resolution_time'),
            __('reports.label_csv.avg_reply_time'),
            __('reports.label_csv.resolution_count'),
        ], $rows);
    }

    public function conversationsSummary(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);
        $summary = (new ConversationsMetricBuilder($account, $this->csvParams($request, ReportScope::TYPE_ACCOUNT)))->summary();

        $rows = [[
            $summary['conversations_count'],
            $summary['incoming_messages_count'],
            $summary['outgoing_messages_count'],
            (new TimeFormatPresenter($summary['avg_first_response_time']))->format(),
            (new TimeFormatPresenter($summary['avg_resolution_time']))->format(),
            $summary['resolutions_count'],
            (new TimeFormatPresenter($summary['reply_time']))->format(),
        ]];

        return $this->csv($request, 'conversations_summary_report', [
            __('reports.conversation_csv.conversations_count'),
            __('reports.conversation_csv.incoming_messages_count'),
            __('reports.conversation_csv.outgoing_messages_count'),
            __('reports.conversation_csv.avg_first_response_time'),
            __('reports.conversation_csv.avg_resolution_time'),
            __('reports.conversation_csv.resolution_count'),
            __('reports.conversation_csv.avg_customer_waiting_time'),
        ], $rows);
    }

    public function conversationTraffic(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeReportView($request);
        $offset = $request->query('timezone_offset');

        $rows = [
            [__('reports.conversation_traffic_csv.timezone'), TimezoneResolver::label($offset)],
            [],
            [],
            ...(new ConversationTrafficReport($account, $offset, $request->query('days_before')))->rows(),
        ];

        return CsvWriter::download('conversation_traffic_reports', $rows);
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<mixed>>  $rows
     */
    private function csv(Request $request, string $filename, array $headers, array $rows): StreamedResponse
    {
        $since = $request->query('since');
        $until = $request->query('until');

        $period = __('reports.period', [
            'since' => blank($since) ? '' : date('Y-m-d', (int) $since),
            'until' => blank($until) ? '' : date('Y-m-d', (int) $until),
        ]);

        return CsvWriter::download($filename, [[$period], [], [], $headers, ...$rows]);
    }

    /**
     * @param  array<string, mixed>  $report
     * @return list<mixed>
     */
    private function readableMetrics(array $report): array
    {
        return [
            $report['conversations_count'] ?? null,
            (new TimeFormatPresenter($report['avg_first_response_time'] ?? null))->format(),
            (new TimeFormatPresenter($report['avg_resolution_time'] ?? null))->format(),
            (new TimeFormatPresenter($report['avg_reply_time'] ?? null))->format(),
            $report['resolved_conversations_count'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    private function buildSummary(Request $request, Account $account, string $method): array
    {
        $since = (int) $request->query('since');
        $until = (int) $request->query('until');

        $current = (new ConversationsMetricBuilder($account, $this->commonParams($request) + [
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'timezone_offset' => $request->query('timezone_offset'),
        ]))->{$method}();

        $previous = (new ConversationsMetricBuilder($account, $this->commonParams($request) + [
            'since' => (string) ($since - ($until - $since)),
            'until' => $request->query('since'),
            'timezone_offset' => $request->query('timezone_offset'),
        ]))->{$method}();

        return [...$current, 'previous' => $previous];
    }

    /** @return array<string, mixed> */
    private function commonParams(Request $request): array
    {
        return [
            'type' => $request->query('type'),
            'id' => $request->query('id'),
            'group_by' => $request->query('group_by'),
            'business_hours' => filter_var($request->query('business_hours'), FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /** @return array<string, mixed> */
    private function reportParams(Request $request): array
    {
        return $this->commonParams($request) + [
            'metric' => $request->query('metric'),
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'timezone_offset' => $request->query('timezone_offset'),
        ];
    }

    /** @return array<string, mixed> */
    private function csvParams(Request $request, ?string $type = null): array
    {
        $params = [
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'business_hours' => filter_var($request->query('business_hours'), FILTER_VALIDATE_BOOLEAN),
        ];

        return $type === null ? $params : [...$params, 'type' => $type];
    }

    /** @return array<string, mixed> */
    private function drilldownParams(Request $request): array
    {
        return [
            'metric' => $request->query('metric'),
            'id' => $request->query('id'),
            'since' => $request->query('since'),
            'until' => $request->query('until'),
            'group_by' => $request->query('group_by'),
            'timezone_offset' => $request->query('timezone_offset'),
            'bucket_timestamp' => $request->query('bucket_timestamp'),
            'page' => $request->query('page'),
            'per_page' => $request->query('per_page'),
            'type' => blank($request->query('type')) ? ReportScope::TYPE_ACCOUNT : (string) $request->query('type'),
            'business_hours' => filter_var($request->query('business_hours'), FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /** @param array<string, mixed> $params */
    private function validDrilldownParams(array $params): bool
    {
        foreach (['metric', 'bucket_timestamp', 'since', 'until'] as $key) {
            if (blank($params[$key] ?? null)) {
                return false;
            }
        }

        return ReportMetricRegistry::supported($params['metric'])
            && DrilldownBuilder::supportedDimensionType($params['type'])
            && DrilldownTimestampValidator::valid($params);
    }
}
