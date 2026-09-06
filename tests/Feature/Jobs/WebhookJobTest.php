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

it('gửi POST kèm chữ ký HMAC và các header giao hàng', function () {
    Http::fake(['https://example.com/hook' => Http::response('', 200)]);

    $payload = ['event' => 'conversation_created', 'id' => 7];

    (new WebhookJob('https://example.com/hook', $payload, Trigger::TYPE_ACCOUNT, 'sec-ret', 'delivery-1'))->handle();

    Http::assertSent(function ($request) use ($payload) {
        $body = $request->body();
        $timestamp = $request->header('X-Chatwoot-Timestamp')[0];
        $expected = 'sha256='.hash_hmac('sha256', "{$timestamp}.{$body}", 'sec-ret');

        return $body === json_encode($payload)
            && $request->header('Content-Type')[0] === 'application/json'
            && $request->header('X-Chatwoot-Delivery')[0] === 'delivery-1'
            && $request->header('X-Chatwoot-Signature')[0] === $expected;
    });
});

it('không gắn header chữ ký khi webhook không có secret', function () {
    Http::fake();

    (new WebhookJob('https://example.com/hook', ['event' => 'contact_created']))->handle();

    Http::assertSent(fn ($request) => $request->header('X-Chatwoot-Signature') === []
        && $request->header('X-Chatwoot-Timestamp') === []);
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
