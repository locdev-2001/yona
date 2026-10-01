<?php

use App\Models\AlertIncident;
use App\Models\AlertRule;
use App\Models\SuperAdmin;
use App\Notifications\AlertNotification;
use App\Notifications\Channels\WebPushChannel;
use App\Services\Admin\Alerts\AlertEvaluator;
use App\Services\Admin\Alerts\AlertMetric;
use App\Services\Admin\Alerts\AlertMetrics;
use App\Services\Admin\Alerts\AlertRuleDefaults;
use App\Services\Admin\Alerts\Metrics\FailedJobsMetric;
use App\Services\Admin\Alerts\Metrics\ZaloBridgeMetric;
use App\Services\Admin\Alerts\MetricUnit;
use App\Services\Admin\Alerts\WindowMode;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

// Chỉ số giả: giá trị đặt tay, cửa sổ/ngưỡng theo từng ca thử.
function fakeAlertMetric(string $key, WindowMode $mode, AlertRuleDefaults $defaults): AlertMetric
{
    return new class($key, $mode, $defaults) implements AlertMetric
    {
        public int|Throwable $value = 0;

        public function __construct(private string $metricKey, private WindowMode $mode, private AlertRuleDefaults $metricDefaults) {}

        public function key(): string
        {
            return $this->metricKey;
        }

        public function defaults(): AlertRuleDefaults
        {
            return $this->metricDefaults;
        }

        public function windowMode(): WindowMode
        {
            return $this->mode;
        }

        public function unit(): MetricUnit
        {
            return MetricUnit::Count;
        }

        public function url(): string
        {
            return '/admin/channel_health';
        }

        public function measure(int $windowMinutes): int
        {
            if ($this->value instanceof Throwable) {
                throw $this->value;
            }

            return $this->value;
        }
    };
}

function useAlertMetrics(AlertMetric ...$metrics): void
{
    app()->instance(AlertMetrics::class, new AlertMetrics(array_values($metrics)));
}

beforeEach(function () {
    // Cảnh báo gửi theo ngôn ngữ của ứng dụng; production chạy tiếng Việt.
    app()->setLocale('vi');
    Notification::fake();
    $this->admins = SuperAdmin::factory()->count(2)->create();
    $this->metric = fakeAlertMetric('fake_lookback', WindowMode::Lookback, new AlertRuleDefaults(threshold: 10, windowMinutes: 15, cooldownMinutes: 60));
    useAlertMetrics($this->metric);
});

it('tạo luật mặc định cho chỉ số chưa có dòng, không ghi đè luật đã chỉnh', function () {
    useAlertMetrics(app(FailedJobsMetric::class), app(ZaloBridgeMetric::class));
    AlertRule::query()->create(['key' => 'failed_jobs', 'threshold' => 3, 'window_minutes' => 5, 'cooldown_minutes' => 10]);

    $rules = app(AlertMetrics::class)->rules();

    expect($rules->keys()->all())->toBe(['failed_jobs', 'zalo_bridge_down'])
        ->and($rules['failed_jobs']->threshold)->toBe(3)
        ->and($rules['zalo_bridge_down']->threshold)->toBe(1)
        ->and($rules['zalo_bridge_down']->window_minutes)->toBe(5)
        ->and($rules['zalo_bridge_down']->enabled)->toBeTrue();
});

it('dưới ngưỡng thì không mở sự cố, không báo', function () {
    $this->metric->value = 9;

    app(AlertEvaluator::class)->evaluate();

    expect(AlertIncident::query()->count())->toBe(0)
        ->and(AlertRule::query()->where('key', 'fake_lookback')->value('last_value'))->toBe(9);
    Notification::assertNothingSent();
});

it('chạm ngưỡng thì mở MỘT sự cố và báo mọi super admin đúng một lần', function () {
    $this->metric->value = 10;

    $result = app(AlertEvaluator::class)->evaluate();
    $this->metric->value = 25;
    app(AlertEvaluator::class)->evaluate();
    app(AlertEvaluator::class)->evaluate();

    expect($result[0]['status'])->toBe('opened');
    $incident = AlertIncident::query()->sole();
    expect($incident->value)->toBe(10)
        ->and($incident->peak_value)->toBe(25)
        ->and($incident->threshold)->toBe(10)
        ->and($incident->notified_at)->not->toBeNull()
        ->and($incident->resolved_at)->toBeNull();

    Notification::assertSentTimes(AlertNotification::class, 2);
    foreach ($this->admins as $admin) {
        Notification::assertSentTo($admin, AlertNotification::class, function (AlertNotification $notification, array $channels) {
            return $channels === ['mail']
                && str_contains($notification->message->subject, 'vượt ngưỡng')
                && $notification->message->actionUrl === url('/admin/channel_health');
        });
    }
});

it('về dưới ngưỡng thì đóng sự cố và báo hồi phục một lần', function () {
    $this->metric->value = 12;
    app(AlertEvaluator::class)->evaluate();

    $this->travel(5)->minutes();
    $this->metric->value = 2;
    $result = app(AlertEvaluator::class)->evaluate();
    app(AlertEvaluator::class)->evaluate();

    expect($result[0]['status'])->toBe('resolved');
    $incident = AlertIncident::query()->sole();
    expect($incident->resolved_at)->not->toBeNull()
        ->and($incident->recovery_notified_at)->not->toBeNull()
        ->and($incident->last_value)->toBe(2);

    $subjects = [];
    Notification::assertSentTo($this->admins->first(), AlertNotification::class, function (AlertNotification $notification) use (&$subjects) {
        $subjects[] = $notification->message->subject;

        return true;
    });
    expect($subjects)->toHaveCount(2)
        ->and($subjects[1])->toStartWith('[Đã hồi phục]');
});

it('vượt lại trong thời gian chờ thì mở sự cố mới nhưng chưa báo, hết thời gian chờ mới báo', function () {
    $this->metric->value = 12;
    app(AlertEvaluator::class)->evaluate();
    $this->travel(5)->minutes();
    $this->metric->value = 0;
    app(AlertEvaluator::class)->evaluate();

    // Chập chờn: vượt lại sau 10 phút, cooldown 60 phút.
    $this->travel(5)->minutes();
    $this->metric->value = 15;
    app(AlertEvaluator::class)->evaluate();

    $second = AlertIncident::query()->latest('id')->first();
    expect(AlertIncident::query()->count())->toBe(2)
        ->and($second->notified_at)->toBeNull();
    Notification::assertSentTimes(AlertNotification::class, 4); // mở + hồi phục, mỗi loại 2 admin

    // Sự cố chưa báo mà hồi phục thì cũng không báo hồi phục.
    $this->travel(5)->minutes();
    $this->metric->value = 0;
    app(AlertEvaluator::class)->evaluate();
    expect($second->fresh()->recovery_notified_at)->toBeNull();
    Notification::assertSentTimes(AlertNotification::class, 4);

    // Hết thời gian chờ, sự cố mới còn mở thì báo.
    $this->travel(5)->minutes();
    $this->metric->value = 15;
    app(AlertEvaluator::class)->evaluate();
    $this->travel(61)->minutes();
    app(AlertEvaluator::class)->evaluate();

    expect(AlertIncident::query()->latest('id')->first()->notified_at)->not->toBeNull();
    Notification::assertSentTimes(AlertNotification::class, 6);
});

it('chỉ số tức thời phải vượt liên tục đủ cửa sổ mới mở sự cố', function () {
    $gauge = fakeAlertMetric('fake_gauge', WindowMode::Sustain, new AlertRuleDefaults(threshold: 5, windowMinutes: 10, cooldownMinutes: 30));
    useAlertMetrics($gauge);
    $gauge->value = 8;

    expect(app(AlertEvaluator::class)->evaluate()[0]['status'])->toBe('pending');
    $this->travel(5)->minutes();
    expect(app(AlertEvaluator::class)->evaluate()[0]['status'])->toBe('pending');

    // Một nhịp dưới ngưỡng thì đếm lại từ đầu.
    $gauge->value = 1;
    app(AlertEvaluator::class)->evaluate();
    $gauge->value = 8;
    $this->travel(5)->minutes();
    expect(app(AlertEvaluator::class)->evaluate()[0]['status'])->toBe('pending');
    $this->travel(10)->minutes();
    expect(app(AlertEvaluator::class)->evaluate()[0]['status'])->toBe('opened');

    Notification::assertSentTimes(AlertNotification::class, 2);
});

it('luật tắt thì không đo, không báo và đóng lặng lẽ sự cố đang mở', function () {
    $this->metric->value = 50;
    app(AlertEvaluator::class)->evaluate();
    AlertRule::query()->where('key', 'fake_lookback')->update(['enabled' => false]);

    $result = app(AlertEvaluator::class)->evaluate();

    expect($result[0]['status'])->toBe('disabled')
        ->and(AlertIncident::query()->sole()->resolved_at)->not->toBeNull()
        ->and(AlertIncident::query()->sole()->recovery_notified_at)->toBeNull();
    Notification::assertSentTimes(AlertNotification::class, 2);
});

it('nguồn số liệu lỗi thì bỏ qua lượt đó, giữ nguyên sự cố', function () {
    $this->metric->value = 50;
    app(AlertEvaluator::class)->evaluate();
    $this->metric->value = new RuntimeException('redis down');

    $result = app(AlertEvaluator::class)->evaluate();

    expect($result[0]['status'])->toBe('unavailable')
        ->and(AlertIncident::query()->sole()->resolved_at)->toBeNull();
});

it('gửi kèm thông báo đẩy khi super admin đã đăng ký trình duyệt', function () {
    $admin = $this->admins->first();
    $admin->notificationSubscriptions()->create([
        'subscription_type' => 1,
        'subscription_attributes' => ['endpoint' => 'https://push.example.com/1', 'p256dh' => 'x', 'auth' => 'y'],
        'identifier' => 'https://push.example.com/1',
    ]);
    $this->metric->value = 11;

    app(AlertEvaluator::class)->evaluate();

    Notification::assertSentTo($admin, AlertNotification::class, function (AlertNotification $notification, array $channels) use ($admin) {
        $push = $notification->toWebPush($admin);

        return in_array(WebPushChannel::class, $channels, true)
            && $push['url'] === url('/admin/channel_health')
            && $push['tag'] === 'admin_alert_fake_lookback';
    });
});

it('thư cảnh báo viết tiếng Việt và dẫn tới trang quản trị liên quan', function () {
    $this->metric->value = 11;
    app(AlertEvaluator::class)->evaluate();

    Notification::assertSentTo($this->admins->first(), AlertNotification::class, function (AlertNotification $notification) {
        $mail = $notification->toMail($this->admins->first());

        return $mail->actionUrl === url('/admin/channel_health')
            && collect($mail->introLines)->contains(fn (string $line) => str_contains($line, '(ngưỡng 10)'))
            && collect($mail->outroLines)->contains(fn (string $line) => str_contains($line, url('/admin/alerts')));
    });
});

it('lệnh alerts:evaluate chạy mỗi 5 phút, không chồng lượt', function () {
    $event = collect(app(Schedule::class)->events())->first(fn ($event) => Str::contains((string) $event->command, 'alerts:evaluate'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('*/5 * * * *')
        ->and($event->withoutOverlapping)->toBeTrue();

    $this->artisan('alerts:evaluate')->assertSuccessful();
});

it('đếm job lỗi trong cửa sổ đánh giá từ bảng failed_jobs', function () {
    foreach ([2, 10, 40] as $minutesAgo) {
        DB::table('failed_jobs')->insert([
            'uuid' => (string) Str::uuid(),
            'connection' => 'redis',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'boom',
            'failed_at' => now()->subMinutes($minutesAgo),
        ]);
    }

    expect(app(FailedJobsMetric::class)->measure(15))->toBe(2);
});

it('zalo-bridge đọc trạng thái monitor:check, chưa có thì gọi thử bridge', function () {
    $metric = app(ZaloBridgeMetric::class);

    Cache::put(ZaloBridgeMetric::MONITOR_STATE_KEY, false);
    expect($metric->measure(5))->toBe(1);

    Cache::put(ZaloBridgeMetric::MONITOR_STATE_KEY, true);
    expect($metric->measure(5))->toBe(0);

    Cache::forget(ZaloBridgeMetric::MONITOR_STATE_KEY);
    Http::fake(fn () => throw new ConnectionException('refused'));
    expect($metric->measure(5))->toBe(1);
});
