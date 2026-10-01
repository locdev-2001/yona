<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AlertIncident;
use App\Models\AlertRule;
use App\Models\NotificationSubscription;
use App\Models\SuperAdmin;
use App\Services\Admin\Alerts\AlertMessage;
use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertMetrics;
use App\Services\Admin\Alerts\AlertNotifier;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Notification\VapidService;
use App\Support\SuperAdminArea;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

// Trang Cảnh báo (/admin/alerts): luật ngưỡng đang so với giá trị đo gần nhất,
// lịch sử sự cố, gửi thử, và đăng ký thông báo đẩy cho chính super admin đang xem.
class AlertsController extends Controller
{
    public const PER_PAGE = 20;

    public const MAX_THRESHOLD = 1_000_000;

    public const MAX_MINUTES = 1440;

    // Khoá công khai P-256 dạng không nén và bí mật auth của RFC 8291.
    private const P256DH_BYTES = 65;

    private const AUTH_SECRET_BYTES = 16;

    public function __construct(private readonly AlertMetrics $metrics) {}

    public function index(Request $request, VapidService $vapid): Response
    {
        $rules = $this->metrics->rules();
        $openIncidents = AlertIncident::query()->open()->whereIn('alert_rule_id', $rules->pluck('id'))->get()->keyBy('alert_rule_id');
        $incidents = AlertIncident::query()->with('rule:id,key')->latest('opened_at')->latest('id')->paginate(self::PER_PAGE)->withQueryString();
        $admin = $request->user('super_admin');

        return Inertia::render('superadmin/Alerts', [
            'rules' => $rules->map(fn (AlertRule $rule, string $key) => $this->rulePayload(
                $rule,
                $this->metrics->find($key),
                $openIncidents->get($rule->id),
            ))->values()->all(),
            'incidents' => collect($incidents->items())->map(fn (AlertIncident $incident) => $this->incidentPayload($incident))->all(),
            'pagination' => ['current' => $incidents->currentPage(), 'last' => $incidents->lastPage(), 'total' => $incidents->total()],
            'push' => [
                'vapidPublicKey' => $vapid->publicKey(),
                'subscriptions' => $admin instanceof SuperAdmin ? $admin->browserPushSubscriptions()->count() : 0,
                'endpoint' => SuperAdminArea::url('api/push_subscriptions'),
            ],
            'stats' => [
                'firing' => $openIncidents->count(),
                'enabled' => $rules->where('enabled', true)->count(),
                'incidents7d' => AlertIncident::query()->where('opened_at', '>=', now()->subDays(7))->count(),
                'recipients' => SuperAdmin::query()->count(),
            ],
            'limits' => ['threshold' => self::MAX_THRESHOLD, 'minutes' => self::MAX_MINUTES],
        ]);
    }

    public function update(Request $request, string $key): RedirectResponse
    {
        $metric = $this->metrics->find($key) ?? abort(404);
        $rule = $this->metrics->rules()->get($key);

        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'threshold' => ['sometimes', 'integer', 'min:1', 'max:'.self::MAX_THRESHOLD],
            'window_minutes' => ['sometimes', 'integer', 'min:0', 'max:'.self::MAX_MINUTES],
            'cooldown_minutes' => ['sometimes', 'integer', 'min:0', 'max:'.self::MAX_MINUTES],
        ]);

        // Chỉ số trạng thái (bridge sống/chết) chỉ có một ngưỡng có nghĩa.
        if ($metric->unit() === MetricUnit::State) {
            unset($data['threshold']);
        }

        $rule->fill($data)->save();

        return back()->with('notice', __('admin_alerts.FLASH.SAVED', ['rule' => AlertMessage::ruleTitle($key)]));
    }

    public function test(Request $request, AlertNotifier $notifier): RedirectResponse
    {
        /** @var SuperAdmin $admin */
        $admin = $request->user('super_admin');

        return $notifier->deliver($admin, AlertMessage::test())
            ? back()->with('notice', __('admin_alerts.FLASH.TEST_SENT', ['email' => $admin->email]))
            : back()->with('error', __('admin_alerts.FLASH.TEST_FAILED'));
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048', 'url:https'],
            'p256dh' => ['required', 'string', $this->base64UrlOfLength(self::P256DH_BYTES)],
            'auth' => ['required', 'string', $this->base64UrlOfLength(self::AUTH_SECRET_BYTES)],
        ]);

        /** @var SuperAdmin $admin */
        $admin = $request->user('super_admin');
        NotificationSubscription::registerBrowserPush($admin, [
            'endpoint' => $data['endpoint'],
            'p256dh' => $data['p256dh'],
            'auth' => $data['auth'],
        ]);

        return response()->json(['subscriptions' => $admin->browserPushSubscriptions()->count()]);
    }

    // Chỉ xoá được đăng ký của chính mình; không thấy vẫn 200.
    public function unsubscribe(Request $request): HttpResponse
    {
        $endpoint = $request->input('endpoint');

        if (is_string($endpoint) && $endpoint !== '') {
            $request->user('super_admin')->notificationSubscriptions()->where('identifier', $endpoint)->delete();
        }

        return response()->noContent(200);
    }

    /** @return array<string, mixed> */
    private function rulePayload(AlertRule $rule, AlertMetric $metric, ?AlertIncident $open): array
    {
        $status = match (true) {
            ! $rule->enabled => 'disabled',
            $open !== null => 'firing',
            $rule->last_evaluated_at === null => 'unknown',
            $rule->breaching_since !== null => 'pending',
            default => 'ok',
        };

        return [
            'key' => $rule->key,
            'enabled' => $rule->enabled,
            'threshold' => $rule->threshold,
            'windowMinutes' => $rule->window_minutes,
            'cooldownMinutes' => $rule->cooldown_minutes,
            'windowMode' => $metric->windowMode()->value,
            'unit' => $metric->unit()->value,
            'lastValue' => $rule->last_value,
            'lastEvaluatedAt' => $rule->last_evaluated_at?->toIso8601String(),
            'status' => $status,
            'openedAt' => $open?->opened_at?->toIso8601String(),
            'url' => $metric->url(),
        ];
    }

    /** @return array<string, mixed> */
    private function incidentPayload(AlertIncident $incident): array
    {
        $key = (string) $incident->rule?->key;

        return [
            'id' => $incident->id,
            'ruleKey' => $key,
            'unit' => $this->metrics->find($key)?->unit()->value ?? MetricUnit::Count->value,
            'value' => $incident->value,
            'peakValue' => $incident->peak_value,
            'threshold' => $incident->threshold,
            'openedAt' => $incident->opened_at?->toIso8601String(),
            'resolvedAt' => $incident->resolved_at?->toIso8601String(),
            'notifiedAt' => $incident->notified_at?->toIso8601String(),
            'recoveryNotifiedAt' => $incident->recovery_notified_at?->toIso8601String(),
        ];
    }

    private function base64UrlOfLength(int $bytes): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($bytes) {
            $decoded = is_string($value) ? base64_decode(strtr($value, '-_', '+/'), true) : false;

            if ($decoded === false || strlen($decoded) !== $bytes) {
                $fail("{$attribute} is invalid");
            }
        };
    }
}
