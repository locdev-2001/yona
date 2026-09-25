<?php

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;

function fakeHorizonRunning(bool $running): void
{
    app()->instance(MasterSupervisorRepository::class, new class($running) implements MasterSupervisorRepository
    {
        public function __construct(private readonly bool $running) {}

        public function all()
        {
            return $this->running ? [(object) ['status' => 'running']] : [];
        }

        public function names()
        {
            return [];
        }

        public function find($name) {}

        public function get(array $names)
        {
            return [];
        }

        public function update($master) {}

        public function forget($name) {}

        public function flushExpired() {}
    });
}

/** Lọc đúng request gửi cảnh báo Telegram — health-check zalo-bridge cũng đi
 *  qua Http::fake nhưng không có key 'text'. */
function telegramAlertContains(mixed $request, string $needle): bool
{
    return str_contains((string) $request->url(), 'telegram.org')
        && str_contains($request['text'], $needle);
}

function anyTelegramAlertSent(): bool
{
    $sent = false;
    Http::assertSent(function ($request) use (&$sent) {
        if (str_contains((string) $request->url(), 'telegram.org')) {
            $sent = true;
        }

        return true;
    });

    return $sent;
}

beforeEach(function () {
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
    ]);
    DB::table('failed_jobs')->truncate();
    Cache::flush();

    // Trạng thái mặc định "khoẻ" cho các kiểm tra không phải trọng tâm của
    // từng test, để một test không vô tình ăn cảnh báo của kiểm tra khác.
    fakeHorizonRunning(true);
    Http::fake([
        (string) config('zalo.bridge.url').'*' => Http::response('ok', 200),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);

    // Socket lắng nghe thật trên cổng ngẫu nhiên để checkReverb() coi là "mở
    // cổng" — không cần accept() kết nối, TCP handshake thành công là đủ cho
    // fsockopen() trong MonitorCheck::reverbPortReachable().
    $this->reverbSocket = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
    $reverbAddress = stream_socket_get_name($this->reverbSocket, false);
    config([
        'reverb.servers.reverb.host' => '127.0.0.1',
        'reverb.servers.reverb.port' => (int) substr($reverbAddress, strrpos($reverbAddress, ':') + 1),
    ]);
});

afterEach(function () {
    if (isset($this->reverbSocket) && is_resource($this->reverbSocket)) {
        fclose($this->reverbSocket);
    }
});

it('không cảnh báo ở lần chạy đầu tiên dù mọi thứ đều khoẻ', function () {
    $this->artisan('monitor:check')->assertSuccessful();

    expect(anyTelegramAlertSent())->toBeFalse();
});

it('cảnh báo khi Horizon chuyển từ chạy sang chết, rồi cảnh báo phục hồi khi chạy lại', function () {
    $this->artisan('monitor:check')->assertSuccessful(); // baseline: chạy

    fakeHorizonRunning(false);
    $this->artisan('monitor:check')->assertSuccessful();
    Http::assertSent(fn ($r) => telegramAlertContains($r, 'Horizon không chạy'));

    fakeHorizonRunning(true);
    $this->artisan('monitor:check')->assertSuccessful();
    Http::assertSent(fn ($r) => telegramAlertContains($r, 'Horizon đã chạy lại'));
});

it('cảnh báo khi zalo-bridge không phản hồi, rồi cảnh báo phục hồi', function () {
    $this->artisan('monitor:check')->assertSuccessful(); // baseline: khoẻ

    Http::fake([
        (string) config('zalo.bridge.url').'*' => Http::response('', 500),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    $this->artisan('monitor:check')->assertSuccessful();
    // Bridge trả 500 vẫn là "phản hồi được" (server sống, chỉ lỗi ứng dụng) —
    // chỉ mất kết nối (timeout/refused) mới coi là down.
    expect(anyTelegramAlertSent())->toBeFalse();

    Http::fake([
        (string) config('zalo.bridge.url').'*' => fn () => throw new ConnectionException('refused'),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    $this->artisan('monitor:check')->assertSuccessful();
    Http::assertSent(fn ($r) => telegramAlertContains($r, 'zalo-bridge không phản hồi'));
});

function insertFailedJob(): void
{
    DB::table('failed_jobs')->insert([
        'uuid' => (string) Str::uuid(),
        'connection' => 'redis',
        'queue' => 'default',
        'payload' => '{}',
        'exception' => 'x',
        'failed_at' => now(),
    ]);
}

it('cảnh báo khi failed_jobs tăng, im lặng khi vẫn tiếp tục tăng, rồi báo khi hết tăng', function () {
    $this->artisan('monitor:check')->assertSuccessful(); // baseline: 0 dòng

    insertFailedJob();
    $this->artisan('monitor:check')->assertSuccessful();
    Http::assertSent(fn ($r) => telegramAlertContains($r, 'failed_jobs đang tăng'));

    // Vẫn đang tăng tiếp (thêm dòng mới) — đã báo "đang tăng" rồi, không báo
    // lại lần thứ hai trong khi vẫn ở trạng thái xấu.
    Http::fake([
        (string) config('zalo.bridge.url').'*' => Http::response('ok', 200),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    insertFailedJob();
    $this->artisan('monitor:check')->assertSuccessful();
    expect(anyTelegramAlertSent())->toBeFalse();

    // Dừng tăng (không thêm dòng mới, nhưng backlog 2 dòng vẫn còn đó) — vẫn
    // đáng báo "hết tăng" vì cơn bão đã dừng, dù chưa ai dọn xong (xem docblock
    // MonitorCheck::checkFailedJobsGrowth).
    Http::fake([
        (string) config('zalo.bridge.url').'*' => Http::response('ok', 200),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);
    $this->artisan('monitor:check')->assertSuccessful();
    Http::assertSent(fn ($r) => telegramAlertContains($r, 'failed_jobs hết tăng'));
});
