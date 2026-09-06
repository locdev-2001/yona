<?php

use App\Jobs\AgentBots\WebhookJob as AgentBotWebhookJob;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Webhooks\RetryableError;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

it('chạy hàng đợi high với mặc định 3 lần thử, cách 3 giây', function () {
    $job = new AgentBotWebhookJob('https://example.com/bot', ['event' => 'message_created']);

    expect($job->queue)->toBe('high')
        ->and($job->tries)->toBe(3)
        ->and($job->backoff())->toBe([3, 3])
        ->and($job->webhookType)->toBe(Trigger::TYPE_AGENT_BOT);
});

it('ném RetryableError với lỗi 429 và 500 để job thử lại', function (int $status) {
    Http::fake(['*' => Http::response('', $status)]);

    $job = new AgentBotWebhookJob('https://example.com/bot', ['event' => 'message_created']);

    expect(fn () => $job->handle())
        ->toThrow(fn (RetryableError $error) => expect($error->status)->toBe($status));
})->with([429, 500]);

it('không thử lại với lỗi ngoài 429/500', function () {
    Http::fake(['*' => Http::response('', 404)]);

    $job = new AgentBotWebhookJob('https://example.com/bot', ['event' => 'message_created']);

    $job->handle();
})->throwsNoExceptions();

it('cạn lượt thử lại thì đưa hội thoại pending về open', function () {
    Queue::fake();

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

    $job = new AgentBotWebhookJob('https://example.com/bot', ['event' => 'message_created', 'id' => $message->id]);
    $job->failed(new RetryableError(500, '500 Internal Server Error'));

    expect($conversation->refresh()->status)->toBe(Conversation::STATUS_OPEN);
    Queue::assertPushed(ActivityMessageJob::class);
});
