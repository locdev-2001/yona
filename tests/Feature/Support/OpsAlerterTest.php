<?php

use App\Support\Alerts\OpsAlerter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
    ]);
});

it('gửi Telegram khi có cấu hình bot', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    app(OpsAlerter::class)->send('signature-a', 'nội dung cảnh báo');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://api.telegram.org/bottest-token/sendMessage'
            && $request['chat_id'] === '999'
            && $request['text'] === 'nội dung cảnh báo';
    });
});

it('gộp các lần gửi trùng chữ ký trong 15 phút thành đúng 1 request', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    $alerter = app(OpsAlerter::class);
    for ($i = 0; $i < 20; $i++) {
        $alerter->send('storm', 'job lỗi hàng loạt');
    }

    Http::assertSentCount(1);
});

it('rơi về ghi log khi chưa cấu hình Telegram', function () {
    config(['services.alert_telegram.bot_token' => null, 'services.alert_telegram.chat_id' => null]);
    Http::preventStrayRequests();
    Log::spy();

    app(OpsAlerter::class)->send('signature-b', 'không có Telegram');

    Log::shouldHaveReceived('warning')->once()->with('[ALERT] không có Telegram');
});

it('vẫn ghi log khi gọi Telegram lỗi', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => false], 500)]);
    Log::spy();

    app(OpsAlerter::class)->send('signature-c', 'telegram lỗi');

    Log::shouldHaveReceived('error')->once();
    Log::shouldHaveReceived('warning')->once()->with('[ALERT] telegram lỗi');
});

it('không bao giờ để bot token lọt vào log kể cả khi Guzzle nối token vào message lỗi', function () {
    // Guzzle nối " for <uri>" vào ConnectException/RequestException, và URI ở đây
    // là /bottest-token/sendMessage — mô phỏng đúng dạng message đó.
    Http::fake(function () {
        throw new RuntimeException('cURL error 28: Connection timed out for https://api.telegram.org/bottest-token/sendMessage');
    });
    Log::spy();

    app(OpsAlerter::class)->send('signature-d', 'timeout');

    Log::shouldHaveReceived('error')->once()->withArgs(fn (string $message) => ! str_contains($message, 'test-token') && str_contains($message, '***'));
});

it('send() không bao giờ ném lỗi ra ngoài dù Cache hỏng', function () {
    Cache::shouldReceive('add')->andThrow(new RuntimeException('redis down'));
    Log::spy();

    app(OpsAlerter::class)->send('signature-e', 'cache hỏng');

    Log::shouldHaveReceived('error')->once();
});
