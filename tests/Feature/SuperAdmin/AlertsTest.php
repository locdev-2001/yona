<?php

use App\Models\AlertIncident;
use App\Models\AlertRule;
use App\Models\SuperAdmin;
use App\Models\SuperAdminAuditLog;
use App\Notifications\AlertNotification;
use App\Services\Admin\Alerts\AlertMetrics;
use App\Services\Admin\Metrics\WidgetRegistry;
use Illuminate\Support\Facades\Notification;

// Trang Cảnh báo của console: luật + giá trị đo gần nhất, chỉnh ngưỡng, gửi thử,
// đăng ký thông báo đẩy của super admin, ô trên trang Tổng quan.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
});

function openAlertIncident(string $key, array $attributes = []): AlertIncident
{
    $rule = app(AlertMetrics::class)->rules()->get($key);

    return $rule->incidents()->create([
        'value' => 12, 'peak_value' => 20, 'last_value' => 15, 'threshold' => 10,
        'opened_at' => now()->subMinutes(30), 'notified_at' => now()->subMinutes(30),
        ...$attributes,
    ]);
}

it('liệt kê mọi luật với ngưỡng mặc định, trạng thái và lịch sử sự cố', function () {
    openAlertIncident('failed_jobs');
    openAlertIncident('failing_channels', ['opened_at' => now()->subDays(2), 'resolved_at' => now()->subDay()]);
    AlertRule::query()->where('key', 'queue_wait')->update(['enabled' => false]);

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/alerts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/Alerts', false)
            ->where('rules', fn ($rules) => collect($rules)->pluck('key')->all() === ['failing_channels', 'failed_jobs', 'queue_backlog', 'queue_wait', 'zalo_bridge_down'])
            ->where('rules.1.status', 'firing')
            ->where('rules.1.threshold', 10)
            ->where('rules.1.windowMinutes', 15)
            ->where('rules.1.windowMode', 'lookback')
            ->where('rules.3.status', 'disabled')
            ->where('rules.4.unit', 'state')
            ->where('rules.4.url', '/admin/channel_health')
            ->has('incidents', 2)
            ->where('incidents.0.ruleKey', 'failed_jobs')
            ->where('incidents.1.resolvedAt', fn ($value) => $value !== null)
            ->where('stats.firing', 1)
            ->where('stats.enabled', 4)
            ->where('stats.incidents7d', 2)
            ->where('stats.recipients', 1)
            ->where('push.endpoint', '/admin/api/push_subscriptions'),
        );
});

it('chỉnh ngưỡng, cửa sổ, thời gian chờ và bật/tắt; ghi nhật ký thao tác', function () {
    $this->actingAs($this->superAdmin, 'super_admin')
        ->from('/admin/alerts')
        ->patch('/admin/alerts/rules/failed_jobs', ['threshold' => 25, 'window_minutes' => 30, 'cooldown_minutes' => 120])
        ->assertRedirect('/admin/alerts')
        ->assertSessionHas('notice');

    $this->actingAs($this->superAdmin, 'super_admin')
        ->patch('/admin/alerts/rules/failed_jobs', ['enabled' => false]);

    $rule = AlertRule::query()->where('key', 'failed_jobs')->sole();
    expect($rule->threshold)->toBe(25)
        ->and($rule->window_minutes)->toBe(30)
        ->and($rule->cooldown_minutes)->toBe(120)
        ->and($rule->enabled)->toBeFalse()
        ->and(SuperAdminAuditLog::query()->where('action', 'PATCH alerts/rules/{key}')->count())->toBe(2);
});

it('từ chối giá trị sai và luật không tồn tại; ngưỡng của chỉ số trạng thái giữ nguyên', function () {
    $this->actingAs($this->superAdmin, 'super_admin')
        ->patch('/admin/alerts/rules/failed_jobs', ['threshold' => 0, 'window_minutes' => -1])
        ->assertSessionHasErrors(['threshold', 'window_minutes']);

    $this->actingAs($this->superAdmin, 'super_admin')
        ->patch('/admin/alerts/rules/nope', ['threshold' => 3])
        ->assertNotFound();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->patch('/admin/alerts/rules/zalo_bridge_down', ['threshold' => 9, 'window_minutes' => 0]);

    $rule = AlertRule::query()->where('key', 'zalo_bridge_down')->sole();
    expect($rule->threshold)->toBe(1)->and($rule->window_minutes)->toBe(0);
});

it('gửi thử tới chính super admin đang bấm', function () {
    Notification::fake();
    $other = SuperAdmin::factory()->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->from('/admin/alerts')
        ->post('/admin/alerts/test')
        ->assertRedirect('/admin/alerts')
        ->assertSessionHas('notice');

    Notification::assertSentTo($this->superAdmin, AlertNotification::class, fn (AlertNotification $notification) => $notification->message->tag === 'admin_alert_test');
    Notification::assertNotSentTo($other, AlertNotification::class);
});

it('super admin đăng ký và gỡ thông báo đẩy của trình duyệt', function () {
    $attributes = [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc',
        'p256dh' => rtrim(strtr(base64_encode(str_repeat('a', 65)), '+/', '-_'), '='),
        'auth' => rtrim(strtr(base64_encode(str_repeat('b', 16)), '+/', '-_'), '='),
    ];

    $this->actingAs($this->superAdmin, 'super_admin')
        ->postJson('/admin/api/push_subscriptions', $attributes)
        ->assertOk()
        ->assertJson(['subscriptions' => 1]);

    expect($this->superAdmin->browserPushSubscriptions()->sole()->subscriptionAttribute('endpoint'))->toBe($attributes['endpoint']);

    $this->actingAs($this->superAdmin, 'super_admin')
        ->postJson('/admin/api/push_subscriptions', [...$attributes, 'auth' => 'short'])
        ->assertUnprocessable();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->deleteJson('/admin/api/push_subscriptions', ['endpoint' => $attributes['endpoint']])
        ->assertOk();

    expect($this->superAdmin->browserPushSubscriptions()->count())->toBe(0);
});

it('chỉ super admin đã đăng nhập mới vào được', function () {
    $this->get('/admin/alerts')->assertRedirect('/admin/sign_in');
    $this->post('/admin/alerts/test')->assertRedirect('/admin/sign_in');
});

it('ô Cảnh báo trên trang Tổng quan đếm sự cố đang mở và sự cố mới nhất', function () {
    openAlertIncident('failing_channels', ['opened_at' => now()->subHour(), 'resolved_at' => now()->subMinutes(10)]);
    $latest = openAlertIncident('failed_jobs', ['opened_at' => now()->subMinutes(5)]);

    $registry = app(WidgetRegistry::class);
    expect($registry->has('alerts'))->toBeTrue();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->getJson('/admin/api/dashboard/widgets/alerts?range=7d')
        ->assertOk()
        ->assertJsonPath('data.open', 1)
        ->assertJsonPath('data.latest.id', $latest->id)
        ->assertJsonPath('data.latest.ruleKey', 'failed_jobs')
        ->assertJsonPath('data.url', '/admin/alerts');
});
