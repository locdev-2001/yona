<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

// Danh sách hộp thư đang hỏng toàn hệ thống, lọc theo loại vấn đề, nền tảng, mức độ.
class ChannelHealthController extends Controller
{
    public const FILTERS = ['problem', 'platform', 'severity', 'search'];

    public function __construct(private readonly ChannelHealthInspector $inspector) {}

    public function index(Request $request): Response
    {
        $summary = $this->inspector->summary();
        $items = collect($summary['items']);
        $filters = array_filter(array_map(fn ($value) => is_scalar($value) ? trim((string) $value) : '', $request->only(self::FILTERS)));

        return Inertia::render('superadmin/ChannelHealth', [
            'stats' => [
                'total' => $summary['total'],
                'healthy' => $summary['healthy'],
                'failing' => $summary['failing'],
                'errors' => $items->where('severity', 'error')->count(),
            ],
            'items' => $this->filter($items, $filters)->values()->all(),
            'filters' => (object) $filters,
            'options' => [
                'problems' => $this->countBy($items, 'problem', 'problemLabel'),
                'platforms' => $items->groupBy(fn (array $item) => $item['platform']['key'])
                    ->map(fn (Collection $group, string $key) => ['value' => $key, 'label' => $group->first()['platform']['name'], 'count' => $group->count()])
                    ->values()->all(),
            ],
        ]);
    }

    /** @param  array<string, string>  $filters */
    private function filter(Collection $items, array $filters): Collection
    {
        $search = mb_strtolower($filters['search'] ?? '');

        return $items
            ->when($filters['problem'] ?? null, fn (Collection $all, string $problem) => $all->where('problem', $problem))
            ->when($filters['severity'] ?? null, fn (Collection $all, string $severity) => $all->where('severity', $severity))
            ->when($filters['platform'] ?? null, fn (Collection $all, string $platform) => $all->filter(fn (array $item) => $item['platform']['key'] === $platform))
            ->when($search !== '', fn (Collection $all) => $all->filter(fn (array $item) => str_contains(
                mb_strtolower($item['inboxName'].' '.$item['accountName'].' #'.$item['accountId']),
                $search,
            )));
    }

    /** @return list<array{value: string, label: string, count: int}> */
    private function countBy(Collection $items, string $key, string $labelKey): array
    {
        return $items->groupBy($key)
            ->map(fn (Collection $group, string $value) => ['value' => $value, 'label' => (string) $group->first()[$labelKey], 'count' => $group->count()])
            ->values()->all();
    }
}
