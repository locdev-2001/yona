<?php

use App\Jobs\Conversations\ActivityMessageJob;
use App\Jobs\WebhookJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

function webhookHeaderPrefixes(): array
{
    return (new ReflectionClassConstant(Trigger::class, 'HEADER_PREFIXES'))->getValue();
}

it('gửi POST kèm chữ ký HMAC và các header giao hàng', function () {
    Http::fake(['https://example.com/hook' => Http::response('', 200)]);

    $payload = ['event' => 'conversation_created', 'id' => 7];

    (new WebhookJob('https://example.com/hook', $payload, Trigger::TYPE_ACCOUNT, 'sec-ret', 'delivery-1'))->handle();

    Http::assertSent(function ($request) use ($payload) {
        $body = $request->body();
        $timestamp = $request->header('X-Yona-Timestamp')[0];
        $expected = 'sha256='.hash_hmac('sha256', "{$timestamp}.{$body}", 'sec-ret');

        return $body === json_encode($payload)
            && $request->header('Content-Type')[0] === 'application/json'
            && $request->header('X-Yona-Delivery')[0] === 'delivery-1'
            && $request->header('X-Yona-Signature')[0] === $expected;
    });
});

// Máy nhận viết theo tên header cũ vẫn kiểm được chữ ký: mọi tiền tố mang đúng giá trị của tên chính.
it('gửi kèm header theo tên cũ với cùng giá trị như tên chính', function () {
    Http::fake();

    (new WebhookJob('https://example.com/hook', ['event' => 'contact_created'], Trigger::TYPE_ACCOUNT, 'sec-ret', 'delivery-1'))->handle();

    $prefixes = webhookHeaderPrefixes();
    expect($prefixes[0])->toBe('X-Yona')->and(count($prefixes))->toBeGreaterThan(1);

    Http::assertSent(function ($request) use ($prefixes) {
        foreach (array_slice($prefixes, 1) as $legacyPrefix) {
            foreach (['Delivery', 'Timestamp', 'Signature'] as $suffix) {
                if ($request->header("{$legacyPrefix}-{$suffix}") !== $request->header("X-Yona-{$suffix}")
                    || $request->header("X-Yona-{$suffix}") === []) {
                    return false;
                }
            }
        }

        return true;
    });
});

// Payload thô của nền tảng (uid, link CDN, chuỗi nội bộ) giữ trong DB cho chiều
// gửi nhưng KHÔNG đi ra bên thứ ba.
it('cắt payload thô của nền tảng khỏi content_attributes trước khi gửi ra ngoài', function () {
    Http::fake();

    $payload = [
        'event' => 'message_created',
        'content_attributes' => [
            'in_reply_to_external_id' => 'msg-1',
            'zca_message' => ['uidFrom' => '9876543210', 'msgId' => 'msg-1'],
            'sticker' => ['id' => 1, 'url' => 'https://cdn.example/s.png'],
        ],
        'conversation' => [
            'messages' => [
                ['id' => 5, 'content_attributes' => ['zca_message' => ['uidFrom' => '9876543210']]],
            ],
        ],
    ];

    (new WebhookJob('https://example.com/hook', $payload))->handle();

    Http::assertSent(function ($request) {
        $sent = json_decode($request->body(), true);

        return ! isset($sent['content_attributes']['zca_message'])
            && ! isset($sent['content_attributes']['sticker'])
            && $sent['content_attributes']['in_reply_to_external_id'] === 'msg-1'
            && ! isset($sent['conversation']['messages'][0]['content_attributes']['zca_message']);
    });
});

it('không gắn header chữ ký khi webhook không có secret', function () {
    Http::fake();

    (new WebhookJob('https://example.com/hook', ['event' => 'contact_created']))->handle();

    Http::assertSent(function ($request) {
        foreach (webhookHeaderPrefixes() as $prefix) {
            if ($request->header("{$prefix}-Signature") !== [] || $request->header("{$prefix}-Timestamp") !== []) {
                return false;
            }
        }

        return true;
    });
});

it('đánh dấu tin thất bại khi webhook của kênh API lỗi', function () {
    Http::fake(['*' => Http::response('', 500)]);
    $message = Message::factory()->create();

    Trigger::execute('https://example.com/hook', ['event' => 'message_created', 'id' => $message->id], Trigger::TYPE_API_INBOX);

    expect($message->refresh()->status)->toBe(Message::STATUSES['failed']);
});

it('đưa hội thoại pending về open và tạo tin hoạt động khi bot chết', function () {
    Queue::fake();
    Http::fake(['*' => Http::response('', 404)]);

    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'status' => Conversation::STATUS_PENDING,
    ]);
    $message = Message::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'conversation_id' => $conversation->id,
    ]);

    Trigger::execute('https://example.com/bot', ['event' => 'message_created', 'id' => $message->id], Trigger::TYPE_AGENT_BOT);

    expect($conversation->refresh()->status)->toBe(Conversation::STATUS_OPEN);

    Queue::assertPushed(ActivityMessageJob::class, fn (ActivityMessageJob $job) => $job->messageParams['content']
        === __('conversations.activity.agent_bot.error_moved_to_open'));
});

it('giữ hội thoại pending khi account bật keep_pending_on_bot_failure', function () {
    Queue::fake();
    Http::fake(['*' => Http::response('', 404)]);

    $account = Account::factory()->create(['settings' => ['keep_pending_on_bot_failure' => true]]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'status' => Conversation::STATUS_PENDING,
    ]);
    $message = Message::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'conversation_id' => $conversation->id,
    ]);

    Trigger::execute('https://example.com/bot', ['event' => 'message_created', 'id' => $message->id], Trigger::TYPE_AGENT_BOT);

    expect($conversation->refresh()->status)->toBe(Conversation::STATUS_PENDING);
    Queue::assertNotPushed(ActivityMessageJob::class);
});
