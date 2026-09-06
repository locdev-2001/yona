<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\CsatSurveyResponseResource;
use App\Models\Account;
use App\Models\CsatSurveyResponse;
use App\Models\Message;
use App\Services\Reports\CsvWriter;
use App\Services\Reports\ReportRange;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

// Port từ Api::V1::Accounts::CsatSurveyResponsesController — báo cáo CSAT
// (index / metrics / download). Bỏ review notes (enterprise).
class CsatSurveyResponsesController extends Controller
{
    private const RESULTS_PER_PAGE = 25;

    public function index(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $responses = $this->filtered($request, $account)
            ->with(['conversation', 'assignedAgent.accountUsers', 'contact'])
            ->orderBy('csat_survey_responses.created_at', $this->sortDirection($request))
            ->forPage(max(1, (int) ($request->query('page') ?: 1)), self::RESULTS_PER_PAGE)
            ->get();

        return response()->json(CsatSurveyResponseResource::forAccount($responses, $account));
    }

    public function metrics(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $responses = $this->filtered($request, $account);
        $ratingsCount = [];

        foreach ((clone $responses)->getQuery()->select('rating')->selectRaw('count(*) as responses_count')->groupBy('rating')->get() as $row) {
            $ratingsCount[(int) $row->rating] = (int) $row->responses_count;
        }

        return response()->json([
            'total_count' => (clone $responses)->count(),
            'ratings_count' => (object) $ratingsCount,
            'total_sent_messages_count' => $this->sentSurveysCount($request, $account),
        ]);
    }

    public function download(Request $request, Account $account): StreamedResponse
    {
        $this->authorizeAdministrator($request);

        $responses = $this->filtered($request, $account)
            ->with(['conversation', 'assignedAgent', 'contact'])
            ->orderBy('csat_survey_responses.created_at', $this->sortDirection($request))
            ->get();

        $rows = $responses->map(fn (CsatSurveyResponse $response) => [
            $response->assignedAgent === null ? null : "{$response->assignedAgent->name} ({$response->assignedAgent->email})",
            $response->rating,
            $response->feedback_message ?: null,
            $response->contact?->name ?: null,
            $response->contact?->email ?: null,
            $response->contact?->phone_number ?: null,
            $response->conversation === null
                ? null
                : url("/app/accounts/{$account->id}/conversations/{$response->conversation->display_id}"),
            $response->created_at->format('Y-m-d H:i:s').' UTC',
        ])->all();

        $since = $request->query('since');
        $until = $request->query('until');

        return CsvWriter::download('csat_report', [
            [
                __('reports.csat.headers.agent_name'),
                __('reports.csat.headers.rating'),
                __('reports.csat.headers.feedback'),
                __('reports.csat.headers.contact_name'),
                __('reports.csat.headers.contact_email_address'),
                __('reports.csat.headers.contact_phone_number'),
                __('reports.csat.headers.link_to_the_conversation'),
                __('reports.csat.headers.recorded_at'),
            ],
            ...$rows,
            [__('reports.period', [
                'since' => blank($since) ? '' : date('Y-m-d', (int) $since),
                'until' => blank($until) ? '' : date('Y-m-d', (int) $until),
            ])],
        ]);
    }

    /** @return Builder<CsatSurveyResponse> */
    private function filtered(Request $request, Account $account): Builder
    {
        $query = CsatSurveyResponse::query()->where('csat_survey_responses.account_id', $account->id);
        $range = ReportRange::fromParams($request->query('since'), $request->query('until'));

        if ($range !== null) {
            $query->where('csat_survey_responses.created_at', '>=', $range->since)
                ->where('csat_survey_responses.created_at', '<', $range->until);
        }

        if (filled($request->query('user_ids'))) {
            $query->whereIn('csat_survey_responses.assigned_agent_id', (array) $request->query('user_ids'));
        }

        if (filled($request->query('rating'))) {
            $query->where('csat_survey_responses.rating', $request->query('rating'));
        }

        foreach (['inbox_id', 'team_id'] as $conversationFilter) {
            if (filled($request->query($conversationFilter))) {
                $query->whereHas('conversation', fn (Builder $inner) => $inner->where($conversationFilter, $request->query($conversationFilter)));
            }
        }

        return $query;
    }

    private function sentSurveysCount(Request $request, Account $account): int
    {
        $query = Message::query()
            ->where('account_id', $account->id)
            ->where('content_type', Message::CONTENT_TYPES['input_csat']);

        $range = ReportRange::fromParams($request->query('since'), $request->query('until'));

        if ($range !== null) {
            $query->where('created_at', '>=', $range->since)->where('created_at', '<', $range->until);
        }

        return $query->count();
    }

    // Sift `sort_on :created_at` — cột sắp xếp duy nhất, tiền tố '-' là giảm dần.
    private function sortDirection(Request $request): string
    {
        return str_starts_with((string) $request->query('sort'), '-') ? 'desc' : 'asc';
    }
}
