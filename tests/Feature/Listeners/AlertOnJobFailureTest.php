<?php

use App\Jobs\ApplicationJob;
use Illuminate\Support\Facades\Http;

class AlwaysFailingTestJob extends ApplicationJob
{
    public function handle(): void
    {
        // Nội dung có vẻ như PII để khẳng định listener không đưa nó vào tin cảnh báo.
        throw new RuntimeException('lộ số điện thoại +84900000000 nếu không cẩn thận');
    }
}

beforeEach(function () {
    config([
        'services.alert_telegram.bot_token' => 'test-token',
        'services.alert_telegram.chat_id' => '999',
        'queue.default' => 'sync',
    ]);
});

it('cảnh báo khi job lỗi hẳn qua JobFailed, không lộ nội dung exception', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    try {
        // Hàng đợi sync bắn JobFailed rồi ném lại exception (Illuminate\Queue\Jobs\Job::fail),
        // đúng hành vi thật của một job chạy đồng bộ và lỗi hẳn.
        dispatch(new AlwaysFailingTestJob);
    } catch (RuntimeException) {
        // Mong đợi.
    }

    Http::assertSent(function ($request) {
        $text = $request['text'];

        return str_contains($text, AlwaysFailingTestJob::class)
            && str_contains($text, 'RuntimeException')
            && ! str_contains($text, '+84900000000');
    });
});

it('gộp nhiều lần job cùng loại lỗi hẳn thành đúng 1 cảnh báo', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true])]);

    for ($i = 0; $i < 5; $i++) {
        try {
            dispatch(new AlwaysFailingTestJob);
        } catch (RuntimeException) {
            // Mong đợi.
        }
    }

    Http::assertSentCount(1);
});
