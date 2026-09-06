<?php

use App\Jobs\Integrations\SendOnSlackJob;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\Message;
use Illuminate\Support\Facades\Http;

// Port từ spec/jobs/send_on_slack_job_spec.rb.

it('gọi SendOnSlackService cho tin incoming', function () {
    $hook = Hook::factory()->create(['reference_id' => 'C1']);
    $message = Message::factory()->create(['account_id' => $hook->account_id, 'content' => 'muchas muchas gracias']);
    Http::fake(['https://slack.com/api/chat.postMessage' => Http::response(['ok' => true, 'ts' => '1', 'message' => ['ts' => '1']])]);

    (new SendOnSlackJob($message, $hook))->handle();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.postMessage');
});

it('gọi SendOnSlackService cho tin template khi hội thoại đã có identifier', function () {
    $hook = Hook::factory()->create(['reference_id' => 'C1']);
    $conversation = Conversation::factory()->create(['account_id' => $hook->account_id, 'identifier' => 'thread-1']);
    $message = Message::factory()->create([
        'account_id' => $hook->account_id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_TEMPLATE,
    ]);
    Http::fake(['https://slack.com/api/chat.postMessage' => Http::response(['ok' => true, 'ts' => '1', 'message' => ['ts' => '1']])]);

    (new SendOnSlackJob($message, $hook))->handle();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.postMessage');
});
