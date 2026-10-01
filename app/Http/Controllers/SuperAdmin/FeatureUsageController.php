<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\Operations\FeatureUsage;
use App\Services\ProductEvents\ProductEventName;
use App\Support\SuperAdminArea;
use Inertia\Inertia;
use Inertia\Response;

// Mức dùng tính năng: bảng tổng theo sự kiện sản phẩm, bấm một dòng ra danh sách account.
class FeatureUsageController extends Controller
{
    public function __construct(private readonly FeatureUsage $usage) {}

    public function index(): Response
    {
        return Inertia::render('superadmin/FeatureUsage', [
            'features' => $this->usage->summary(),
            'windows' => array_map(fn (int $days) => "{$days}d", FeatureUsage::WINDOWS),
            'trendDays' => FeatureUsage::TREND_DAYS,
        ]);
    }

    public function show(string $name): Response
    {
        $event = ProductEventName::tryFrom($name) ?? abort(404);

        return Inertia::render('superadmin/FeatureUsageAccounts', [
            'feature' => ['key' => $event->value, 'label' => $event->label(), 'group' => $event->group()],
            'accounts' => $this->usage->accounts($event),
            'limit' => FeatureUsage::ACCOUNTS_LIMIT,
            'backUrl' => SuperAdminArea::url('feature_usage'),
        ]);
    }
}
