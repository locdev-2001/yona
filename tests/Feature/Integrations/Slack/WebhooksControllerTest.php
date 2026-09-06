<?php

use App\Jobs\Integrations\SlackUnfurlJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

// Port từ spec/controllers/api/v1/integrations/webhooks_controller_spec.rb —
// cổng công khai (KHÔNG auth) Slack Event Subscriptions gọi vào.

it('không yêu cầu đăng nhập và trả challenge cho url_verification', function () {
    $response = $this->postJson('/api/v1/integrations/webhooks', [
        'type' => 'url_verification',
        'challenge' => 'abc123',
    ])->assertOk();

    expect($response->json('challenge'))->toBe('abc123');
});

it('tạo tin nhắn khi nhận event_callback hợp lệ', function () {
    $account = Account::factory()->create();
    Hook::factory()->create(['account_id' => $account->id, 'reference_id' => 'G1']);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'identifier' => 'thread-1']);

    Http::fake(['https://slack.com/api/users.info*' => Http::response(['ok' => true, 'user' => ['profile' => ['email' => null]]])]);

    $response = $this->postJson('/api/v1/integrations/webhooks', [
        'type' => 'event_callback',
        'event' => [
            'type' => 'message',
            'user' => 'U1',
            'text' => 'Xin chào từ Slack',
            'ts' => '111.222',
            'thread_ts' => 'thread-1',
            'channel' => 'G1',
            'blocks' => [['type' => 'rich_text']],
        ],
    ])->assertOk();

    expect($response->json('status'))->toBe('success')
        ->and($conversation->messages()->count())->toBe(1);
});

it('dispatch SlackUnfurlJob khi nhận link_shared', function () {
    Queue::fake();

    $this->postJson('/api/v1/integrations/webhooks', [
        'type' => 'event_callback',
        'event' => ['type' => 'link_shared', 'user' => 'U1', 'channel' => 'G1', 'links' => []],
    ])->assertOk();

    Queue::assertPushed(SlackUnfurlJob::class);
});
