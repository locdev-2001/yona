<?php

use Illuminate\Support\Facades\Http;
use Laravel\Horizon\Events\LongWaitDetected;

beforeEach(function () {
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
    ]);
});

it('cảnh báo khi Horizon bắn LongWaitDetected', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    event(new LongWaitDetected('redis', 'critical', 45));

    Http::assertSent(function ($request) {
        return str_contains($request['text'], 'critical')
            && str_contains($request['text'], 'redis')
            && str_contains($request['text'], '45');
    });
});
