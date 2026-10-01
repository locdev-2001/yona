<?php

use App\Livewire\Pulse\SearchOutboxCard;
use App\Models\SuperAdmin;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Pulse\Facades\Pulse;
use Laravel\Pulse\Livewire as PulseCards;
use Livewire\Livewire;

// /horizon, /pulse và /logs đọc payload job, URI request và toàn bộ log
// (nội dung tin nhắn khách, số điện thoại, payload webhook Zalo). Ba dashboard
// này do gói ngoài đăng ký route nên không nằm trong routes/web.php — test này
// là chỗ duy nhất chặn việc nâng cấp gói làm hở guard.
$dashboards = ['/horizon', '/pulse', '/logs', 'API log viewer' => '/logs/api/folders'];

const SYSTEM_ADMIN_EMAIL = 'van-hanh@yona.vn';

beforeEach(fn () => config(['yona.system_admin_emails' => SYSTEM_ADMIN_EMAIL]));

it('bắt khách lạ đăng nhập console quản trị', function (string $path) {
    $this->get($path)->assertRedirect('/admin/sign_in');
})->with($dashboards);

it('trả 401 cho khách lạ gọi API log viewer', function () {
    $this->getJson('/logs/api/folders')->assertUnauthorized();
});

it('không cho agent thường không có email hệ thống vào', function (string $path) {
    $this->actingAs(User::factory()->create())
        ->get($path)
        ->assertForbidden();
})->with($dashboards);

it('cho user có email hệ thống vào dù chưa bật 2FA', function (string $path) {
    $systemAdmin = User::factory()->create(['email' => SYSTEM_ADMIN_EMAIL]);

    expect($systemAdmin->mfaEnabled())->toBeFalse();

    $this->actingAs($systemAdmin)
        ->get($path)
        ->assertOk();
})->with($dashboards);

it('cho super admin đã bật 2FA vào', function (string $path) {
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin')
        ->get($path)
        ->assertOk();
})->with($dashboards);

it('đưa super admin chưa bật 2FA vào màn cài đặt thay vì cho vào dashboard', function (string $path) {
    $this->actingAs(SuperAdmin::factory()->create(), 'super_admin')
        ->get($path)
        ->assertRedirect('/admin/mfa/setup');
})->with($dashboards);

it('không cho xoá file log qua giao diện', function () {
    expect(Gate::forUser(SuperAdmin::factory()->create())->allows('deleteLogFile'))->toBeFalse();
});

it('giữ đúng thứ tự tier khi Horizon nuôi worker, tệp gửi ở pool riêng', function () {
    $tiers = require config_path('queue_tiers.php');
    $supervisors = config('horizon.defaults');

    expect($supervisors['supervisor-1']['queue'])->toBe(array_values(array_diff($tiers, ['media'])))
        ->and($supervisors['supervisor-realtime']['queue'])->toBe(['critical'])
        ->and($supervisors['supervisor-media']['queue'])->toBe(['media'])
        ->and(array_diff($tiers, ...array_column($supervisors, 'queue')))->toBeEmpty();

    foreach ($supervisors as $supervisor) {
        expect($supervisor['balance'])->toBeFalse()
            ->and($supervisor['timeout'])->toBeLessThan(config('queue.connections.redis.retry_after'));
    }
});

// balance tắt thì Horizon hạ pool về minProcesses khi rảnh và chỉ thêm một process
// mỗi 3 giây khi có việc: pool phải cố định để worker luôn đủ và ấm.
it('mọi pool worker production cố định số process', function () {
    $production = config('horizon.environments.production');

    foreach (['supervisor-realtime', 'supervisor-1', 'supervisor-media'] as $name) {
        expect($production[$name]['minProcesses'])->toBe($production[$name]['maxProcesses'])
            ->and($production[$name]['maxProcesses'])->toBeGreaterThanOrEqual(1);
    }
});

// Thẻ Pulse nạp lười (request Livewire riêng sau khi trang mở) và nhớ kết quả
// truy vấn trong cache vài giây. Lần render thứ hai unserialize thẻ từ cache:
// lớp nào không nằm trong cache.serializable_classes thành
// __PHP_Incomplete_Class và thẻ ném Error.
it('render thẻ Pulse lần hai từ cache mà không vỡ', function (string $card, string $expectedText) {
    $now = now()->getTimestamp();
    $user = User::factory()->create(['name' => 'Người dùng Pulse']);

    Pulse::startRecording();
    Pulse::record('exception', json_encode([RuntimeException::class, 'app/Example.php:1']), $now, $now)->max()->count();
    Pulse::record('slow_query', json_encode(['select pulse_probe', 'app/Example.php:2']), 1500, $now)->max()->count();
    Pulse::record('slow_request', json_encode(['GET', '/pulse-probe', 'Closure']), 1500, $now)->max()->count();
    Pulse::record('slow_job', 'App\\Jobs\\PulseProbeJob', 1500, $now)->max()->count();
    Pulse::record('slow_outgoing_request', json_encode(['GET', 'https://probe.example/']), 1500, $now)->max()->count();
    Pulse::record('user_request', (string) $user->id, null, $now)->count();
    Pulse::record('queued', 'redis:pulse-probe-queue', null, $now)->count()->onlyBuckets();
    Pulse::record('cache_hit', 'pulse-probe-key', null, $now)->count();
    Pulse::record('cpu', 'pulse-probe-server', 12, $now)->avg()->onlyBuckets();
    Pulse::record('memory', 'pulse-probe-server', 512, $now)->avg()->onlyBuckets();
    Pulse::set('system', 'pulse-probe-server', json_encode([
        'name' => 'pulse-probe-server', 'cpu' => 12, 'memory_used' => 512, 'memory_total' => 1024, 'storage' => [],
    ]), $now);
    Pulse::ingest();
    Pulse::stopRecording();

    // Store của test mặc định không serialize; bật lên để giống Redis trên production.
    config(['cache.stores.array.serialize' => true]);
    Cache::purge('array');

    $cachedCardKeys = fn () => array_filter(
        array_keys((fn () => $this->storage)->call(Cache::store('array')->getStore())),
        fn (string $key) => str_starts_with($key, 'laravel:pulse:'.$card.':'),
    );

    Livewire::withoutLazyLoading()->test($card)->assertOk();

    expect($cachedCardKeys())->not->toBeEmpty();

    Livewire::withoutLazyLoading()->test($card)->assertOk()->assertSee($expectedText);
})->with([
    'exceptions' => [PulseCards\Exceptions::class, RuntimeException::class],
    'slow-queries' => [PulseCards\SlowQueries::class, 'pulse_probe'],
    'slow-requests' => [PulseCards\SlowRequests::class, '/pulse-probe'],
    'slow-jobs' => [PulseCards\SlowJobs::class, 'PulseProbeJob'],
    'slow-outgoing-requests' => [PulseCards\SlowOutgoingRequests::class, 'probe.example'],
    'usage' => [PulseCards\Usage::class, 'Người dùng Pulse'],
    'queues' => [PulseCards\Queues::class, 'pulse-probe-queue'],
    'cache' => [PulseCards\Cache::class, 'pulse-probe-key'],
    'servers' => [PulseCards\Servers::class, 'pulse-probe-server'],
    'search-outbox' => [SearchOutboxCard::class, 'Outbox tìm kiếm'],
]);

// `avatar` của User là quan hệ tới tệp đính kèm, không phải URL ảnh mà thẻ người dùng của Pulse cần.
it('thẻ Usage hiện nhân viên có ảnh đại diện bằng URL ảnh, cả khi đọc lại từ cache', function () {
    Storage::fake();
    $user = User::factory()->create(['name' => 'Nhân viên có ảnh']);
    $user->replaceAvatarFromContents('png-bytes', 'anh.png', 'image/png');
    $now = now()->getTimestamp();

    Pulse::startRecording();
    Pulse::record('user_request', (string) $user->id, null, $now)->count();
    Pulse::ingest();
    Pulse::stopRecording();

    config(['cache.stores.array.serialize' => true]);
    Cache::purge('array');
    Livewire::withoutLazyLoading()->test(PulseCards\Usage::class)->assertOk();

    Livewire::withoutLazyLoading()->test(PulseCards\Usage::class)
        ->assertOk()
        ->assertSee('Nhân viên có ảnh')
        ->assertSee('src="'.$user->fresh()->avatarUrl().'"', escape: false);
});
