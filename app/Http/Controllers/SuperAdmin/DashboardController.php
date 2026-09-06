<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

// Port từ refs/chatwoot/app/controllers/super_admin/dashboard_controller.rb —
// trang HTML rỗng, số liệu nạp bằng một lần gọi JSON vào chính đường dẫn đó.
class DashboardController extends Controller
{
    private const STATS_CACHE_SECONDS = 1800;

    public function index(Request $request): Response|JsonResponse
    {
        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json($this->stats());
        }

        return Inertia::render('superadmin/Dashboard');
    }

    private function stats(): array
    {
        return Cache::remember('super_admin:dashboard_stats', self::STATS_CACHE_SECONDS, fn () => [
            'chartData' => $this->conversationsByDay(),
            'accountsCount' => number_format(Account::query()->count()),
            'usersCount' => number_format(User::query()->count()),
            'inboxesCount' => number_format(Inbox::query()->count()),
            'conversationsCount' => number_format($this->conversationsCountEstimate()),
        ]);
    }

    /** @return list<array{0: string, 1: int}> */
    private function conversationsByDay(): array
    {
        $counts = Conversation::query()
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('date(created_at) as day, count(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range(30, 0))
            ->map(fn (int $daysAgo) => now()->subDays($daysAgo)->toDateString())
            ->map(fn (string $day) => [$day, (int) ($counts[$day] ?? 0)])
            ->all();
    }

    // conversations_count_estimate — đếm chính xác quá nặng nên bản gốc đọc
    // reltuples của Postgres, âm thì mới đếm thật.
    private function conversationsCountEstimate(): int
    {
        $estimate = (int) DB::scalar("SELECT reltuples::bigint FROM pg_class WHERE relname = 'conversations'");

        return $estimate < 0 ? Conversation::query()->count() : $estimate;
    }
}
