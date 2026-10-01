<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Metrics\ComputesMetrics;
use App\Services\Admin\Metrics\DashboardLayout;
use App\Services\Admin\Metrics\DashboardWidget;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\WidgetRegistry;
use App\Services\Admin\Metrics\WidgetSize;
use App\Support\SuperAdminArea;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

// Trang Tổng quan chỉ giao danh mục ô + bố cục; mỗi ô tự gọi API lấy số.
class DashboardController extends Controller
{
    public const SOURCE_SERVER = 'server';

    public const SOURCE_CLIENT = 'client';

    private const TASK_BOARD_URL = 'https://dash.yona.vn';

    public function __construct(
        private readonly WidgetRegistry $registry,
        private readonly DashboardLayout $layout,
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('superadmin/Dashboard', [
            'widgets' => array_map($this->describe(...), $this->registry->all()),
            'layout' => $this->layout->for($request->user('super_admin')),
            'sizes' => WidgetSize::values(),
            'ranges' => array_keys(DateRange::PRESETS),
            'defaultRange' => DateRange::DEFAULT_PRESET,
            'endpoints' => [
                'widgets' => SuperAdminArea::url('api/dashboard/widgets'),
                'layout' => SuperAdminArea::url('api/dashboard/layout'),
            ],
            'links' => $this->operationLinks(),
        ]);
    }

    /** @return array{key: string, title: string, description: string, defaultSize: string, source: string} */
    private function describe(DashboardWidget $widget): array
    {
        $langKey = 'admin_dashboard.WIDGETS.'.Str::upper($widget->key());

        return [
            'key' => $widget->key(),
            'title' => __("{$langKey}.TITLE"),
            'description' => __("{$langKey}.DESCRIPTION"),
            'defaultSize' => $widget->defaultSize()->value,
            'source' => $widget instanceof ComputesMetrics ? self::SOURCE_SERVER : self::SOURCE_CLIENT,
        ];
    }

    /** @return list<array{key: string, url: string, external: bool}> */
    private function operationLinks(): array
    {
        $path = static fn (string $configKey, string $fallback) => '/'.trim((string) config($configKey, $fallback), '/');

        return [
            ['key' => 'horizon', 'url' => $path('horizon.path', 'horizon'), 'external' => false],
            ['key' => 'pulse', 'url' => $path('pulse.path', 'pulse'), 'external' => false],
            ['key' => 'logs', 'url' => $path('log-viewer.route_path', 'logs'), 'external' => false],
            ['key' => 'tasks', 'url' => self::TASK_BOARD_URL, 'external' => true],
        ];
    }
}
