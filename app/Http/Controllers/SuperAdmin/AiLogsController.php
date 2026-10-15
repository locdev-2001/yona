<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AiAgent;
use App\Models\ApiLog;
use App\Services\Admin\AiLogs\ApiLogInspector;
use App\Services\Admin\Operations\DataBrowser;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

// Super Admin › Nhật ký AI: mỗi lần gọi mô hình một dòng `api_logs`, chỉ đọc. Chỉ admin
// Yona thấy; doanh nghiệp không thấy các bước của AI hay chi phí. Khoá API không bao
// giờ nằm trong `api_logs` (chỉ ở header khi gọi) nên không có gì phải che ở đây.
class AiLogsController extends Controller
{
    public const PER_PAGE = 50;

    public const FILTERS = ['account_id', 'conversation_id', 'ai_agent_id', 'route', 'result', 'q', 'window'];

    public const WINDOWS = ['24h' => 24, '7d' => 168, '30d' => 720];

    public const DEFAULT_WINDOW = '24h';

    // Các lần gọi cách nhau không quá ngần này trong cùng hội thoại coi là một lượt
    // (một lượt AI có hạn chót 120 giây, xem config agent.turn.deadline_seconds).
    private const TURN_WINDOW_SECONDS = 150;

    public function __construct(private readonly ApiLogInspector $inspector) {}

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $logs = $this->filtered($filters)
            ->with(['account:id,name', 'aiAgent:id,name'])
            ->latest('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        $selectedId = ctype_digit((string) $request->query('log')) ? (int) $request->query('log') : null;

        return Inertia::render('superadmin/AiLogs', [
            'logs' => collect($logs->items())->map(fn (ApiLog $log) => $this->row($log))->all(),
            'pagination' => ['current' => $logs->currentPage(), 'last' => $logs->lastPage(), 'total' => $logs->total()],
            'filters' => (object) $filters,
            'options' => $this->options(),
            'selected' => $selectedId === null ? null : $this->detail($selectedId),
        ]);
    }

    /** @return array<string, string> */
    private function filters(Request $request): array
    {
        $filters = array_filter(array_map(
            fn ($value) => is_scalar($value) ? trim((string) $value) : '',
            $request->only(self::FILTERS),
        ), fn (string $value) => $value !== '');

        $filters['window'] = array_key_exists($filters['window'] ?? '', self::WINDOWS) || ($filters['window'] ?? '') === 'all'
            ? $filters['window']
            : self::DEFAULT_WINDOW;

        return $filters;
    }

    /** @param  array<string, string>  $filters */
    private function filtered(array $filters): Builder
    {
        return ApiLog::query()
            ->when(ctype_digit($filters['account_id'] ?? ''), fn (Builder $query) => $query->where('account_id', (int) $filters['account_id']))
            ->when(ctype_digit($filters['conversation_id'] ?? ''), fn (Builder $query) => $query->where('conversation_id', (int) $filters['conversation_id']))
            ->when(ctype_digit($filters['ai_agent_id'] ?? ''), fn (Builder $query) => $query->where('ai_agent_id', (int) $filters['ai_agent_id']))
            ->when($filters['route'] ?? null, function (Builder $query, string $route) {
                [$provider, $model] = array_pad(explode('|', $route, 2), 2, null);
                $query->where('provider', $provider)->when($model, fn (Builder $inner) => $inner->where('model', $model));
            })
            ->when($filters['result'] ?? null, fn (Builder $query, string $result) => match ($result) {
                'ok' => $query->whereNull('error_code')->whereBetween('http_status', [200, 299]),
                'error' => $query->where(fn (Builder $inner) => $inner->whereNotNull('error_code')->orWhereNull('http_status')->orWhere('http_status', '>=', 300)),
                default => $query,
            })
            ->when($filters['q'] ?? null, function (Builder $query, string $needle) {
                $like = '%'.DataBrowser::escapeLike($needle).'%';
                $query->where(fn (Builder $inner) => $inner
                    ->whereRaw('request::text ilike ?', [$like])
                    ->orWhereRaw('response::text ilike ?', [$like]));
            })
            ->when(self::WINDOWS[$filters['window']] ?? null, fn (Builder $query, int $hours) => $query->where('created_at', '>=', now()->subHours($hours)));
    }

    /** @return array<string, mixed> */
    private function row(ApiLog $log): array
    {
        return [
            'id' => $log->id,
            'createdAt' => $log->created_at?->toIso8601String(),
            'accountId' => $log->account_id,
            'accountName' => $log->account?->name,
            'conversationId' => $log->conversation_id,
            'aiAgentId' => $log->ai_agent_id,
            'aiAgentName' => $log->aiAgent?->name,
            'provider' => $log->provider,
            'model' => $log->model,
            'httpStatus' => $log->http_status,
            'errorCode' => $log->error_code,
            'finishReason' => $this->inspector->finishReason($log),
            'inputTokens' => $log->input_tokens,
            'outputTokens' => $log->output_tokens,
            'cacheReadTokens' => $log->cache_read_tokens,
            'cacheWriteTokens' => $log->cache_write_tokens,
            'costMicroUsd' => $log->cost_micro_usd,
            'latencyMs' => $log->latency_ms,
        ];
    }

    /** @return array<string, mixed>|null */
    private function detail(int $id): ?array
    {
        $log = ApiLog::query()->with(['account:id,name', 'aiAgent:id,name', 'conversation:id,display_id,account_id'])->find($id);

        if ($log === null) {
            return null;
        }

        $turn = $this->turnOf($log);

        return [
            ...$this->row($log),
            'endpoint' => $this->inspector->endpoint($log->provider),
            'request' => $log->request,
            'response' => $log->response,
            'curl' => $this->inspector->curl($log),
            'toolCalls' => $this->inspector->toolCalls($log),
            'conversationUrl' => $log->conversation === null
                ? null
                : "/app/accounts/{$log->account_id}/conversations/{$log->conversation->display_id}",
            'accountUrl' => SuperAdminArea::url("accounts/{$log->account_id}/overview"),
            'turn' => [
                'calls' => $turn->map(fn (ApiLog $call) => $this->row($call))->values()->all(),
                'costMicroUsd' => (int) $turn->sum('cost_micro_usd'),
                'latencyMs' => (int) $turn->sum('latency_ms'),
            ],
        ];
    }

    /**
     * Các lần gọi cùng lượt: cùng hội thoại, nối nhau không quá TURN_WINDOW_SECONDS.
     *
     * @return Collection<int, ApiLog>
     */
    private function turnOf(ApiLog $log): Collection
    {
        if ($log->conversation_id === null || $log->created_at === null) {
            return collect([$log]);
        }

        $nearby = ApiLog::query()
            ->with(['account:id,name', 'aiAgent:id,name'])
            ->where('conversation_id', $log->conversation_id)
            ->whereBetween('created_at', [
                $log->created_at->copy()->subSeconds(self::TURN_WINDOW_SECONDS * 2),
                $log->created_at->copy()->addSeconds(self::TURN_WINDOW_SECONDS * 2),
            ])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $index = $nearby->search(fn (ApiLog $call) => $call->id === $log->id);
        if ($index === false) {
            return collect([$log]);
        }

        $start = $index;
        while ($start > 0 && $nearby[$start]->created_at->diffInSeconds($nearby[$start - 1]->created_at, true) <= self::TURN_WINDOW_SECONDS) {
            $start--;
        }

        $end = $index;
        while ($end < $nearby->count() - 1 && $nearby[$end + 1]->created_at->diffInSeconds($nearby[$end]->created_at, true) <= self::TURN_WINDOW_SECONDS) {
            $end++;
        }

        return $nearby->slice($start, $end - $start + 1)->values();
    }

    /** @return array<string, list<array{value: string, label: string}>> */
    private function options(): array
    {
        $since = now()->subHours(self::WINDOWS['30d']);

        $accountIds = ApiLog::query()->where('created_at', '>=', $since)->distinct()->pluck('account_id');
        $aiAgentIds = ApiLog::query()->where('created_at', '>=', $since)->whereNotNull('ai_agent_id')->distinct()->pluck('ai_agent_id');

        return [
            'accounts' => Account::query()->whereKey($accountIds)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Account $account) => ['value' => (string) $account->id, 'label' => "{$account->name} (#{$account->id})"])->all(),
            'aiAgents' => AiAgent::query()->whereKey($aiAgentIds)->orderBy('name')->get(['id', 'name', 'account_id'])
                ->map(fn (AiAgent $aiAgent) => ['value' => (string) $aiAgent->id, 'label' => "{$aiAgent->name} (#{$aiAgent->id})"])->all(),
            'routes' => ApiLog::query()->where('created_at', '>=', $since)->select('provider', 'model')->distinct()->orderBy('provider')->orderBy('model')->get()
                ->map(fn (ApiLog $route) => ['value' => "{$route->provider}|{$route->model}", 'label' => "{$route->provider} · {$route->model}"])->all(),
        ];
    }
}
