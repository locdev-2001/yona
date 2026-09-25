<?php

use App\Jobs\Zalo\ZaloHealthSweepJob;
use App\Models\Channel\Zalo;
use App\Services\Zalo\ZaloBridgeClient;
use App\Services\Zalo\ZaloHealthMonitor;
use App\Services\Zalo\ZaloProfileSync;
use App\Support\Alerts\OpsAlerter;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
    ]);
});

it('cảnh báo khi một kênh Zalo mất phiên đăng nhập, chỉ kèm id kênh và lý do', function () {
    $channel = Zalo::factory()->create(['state' => Zalo::STATE_CONNECTED]);

    Http::fake([
        zaloBridgePattern('health*') => Http::response(['connected' => false], 200),
        'api.telegram.org/*' => Http::response(['ok' => true]),
    ]);

    // Ngưỡng ZaloHealthSweepJob::FAILURE_THRESHOLD = 3 lượt liên tiếp mới hạ trạng thái.
    for ($i = 0; $i < ZaloHealthSweepJob::FAILURE_THRESHOLD; $i++) {
        (new ZaloHealthSweepJob($channel->id))->handle(
            app(ZaloBridgeClient::class),
            app(ZaloHealthMonitor::class),
            app(ZaloProfileSync::class),
            app(OpsAlerter::class),
        );
    }

    expect($channel->refresh()->state)->toBe(Zalo::STATE_SESSION_LOST);

    Http::assertSent(function ($request) use ($channel) {
        if (! str_contains((string) $request->url(), 'telegram.org')) {
            return false;
        }

        $text = $request['text'];

        return str_contains($text, (string) $channel->id)
            && str_contains($text, 'mất phiên đăng nhập')
            && ! str_contains($text, $channel->phone ?? '__no_phone__');
    });
});

it('không cảnh báo khi kênh vẫn kết nối bình thường', function () {
    $channel = Zalo::factory()->create(['state' => Zalo::STATE_CONNECTED]);

    Http::fake([zaloBridgePattern('health*') => Http::response([
        'connected' => true,
        'integrated_display_name' => 'Test',
    ], 200)]);

    (new ZaloHealthSweepJob($channel->id))->handle(
        app(ZaloBridgeClient::class),
        app(ZaloHealthMonitor::class),
        app(ZaloProfileSync::class),
        app(OpsAlerter::class),
    );

    Http::assertNotSent(fn ($request) => str_contains((string) $request->url(), 'telegram.org'));
});
