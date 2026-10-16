<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AiAnalytics\AiUsageReport;
use App\Services\Admin\AiAnalytics\UsageWindow;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Super Admin › Phân tích AI: chi phí, kết quả lượt, token và cache, lỗi gọi mô hình
// của nhân viên AI theo khoảng thời gian, account, nhân viên AI. Chỉ admin Yona thấy.
class AiAnalyticsController extends Controller
{
    public function __construct(private readonly AiUsageReport $report) {}

    public function index(Request $request): Response
    {
        $window = UsageWindow::resolve(
            self::text($request, 'range'),
            self::text($request, 'from'),
            self::text($request, 'to'),
        );
        $accountId = self::id($request, 'account_id');
        $aiAgentId = self::id($request, 'ai_agent_id');

        return Inertia::render('superadmin/AiAnalytics', [
            'window' => $window->toArray(),
            'presets' => UsageWindow::PRESETS,
            'filters' => ['accountId' => $accountId, 'aiAgentId' => $aiAgentId],
            ...$this->report->build($window, $accountId, $aiAgentId),
            'options' => $this->report->options($accountId),
        ]);
    }

    private static function text(Request $request, string $key): ?string
    {
        $value = $request->query($key);

        return is_string($value) && $value !== '' ? $value : null;
    }

    private static function id(Request $request, string $key): ?int
    {
        $value = self::text($request, $key);

        return $value !== null && ctype_digit($value) && (int) $value > 0 ? (int) $value : null;
    }
}
