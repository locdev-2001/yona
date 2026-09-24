<?php

use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/tiktok/message_service_spec.rb +
// spec/controllers/webhooks/tiktok_controller_spec.rb.

beforeEach(function () {
    config()->set('services.tiktok.app_secret', 'tiktok-secret');
    $this->inbox = Inbox::factory()->tiktok()->create();
    $this->channel = $this->inbox->channel;
    $this->channel->update(['business_id' => 'business-open-id']);
});

function tiktokPost(array $payload, string $secret = 'tiktok-secret', ?int $timestamp = null): TestResponse
{
    $body = json_encode($payload);
    $timestamp ??= time();

    return test()->call('POST', '/webhooks/tiktok', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_TIKTOK_SIGNATURE' => "t={$timestamp},s=".hash_hmac('sha256', $timestamp.'.'.$body, $secret),
    ], $body);
}

it('tạo hội thoại và tin đến từ sự kiện im_receive_msg', function () {
    Http::fake();
    tiktokPost(ChannelFixture::load('tiktok_receive'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ TikTok')
        ->and($message->source_id)->toBe('msg-1')
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->conversation->contact->name)->toBe('khach_tiktok')
        ->and($message->conversation->additional_attributes['conversation_id'])->toBe('conv-1')
        ->and($message->conversation->contactInbox->source_id)->toBe('conv-1');
});

it('từ chối chữ ký sai', function () {
    tiktokPost(ChannelFixture::load('tiktok_receive'), 'sai-secret')->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('từ chối chữ ký quá hạn 5 giây', function () {
    tiktokPost(ChannelFixture::load('tiktok_receive'), timestamp: time() - 60)->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('gửi tin đi qua Business Messaging API', function () {
    Http::fake([
        'business-api.tiktok.com/*' => Http::response(['data' => ['message' => ['message_id' => 'msg-out']]]),
    ]);
    tiktokPost(ChannelFixture::load('tiktok_receive'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/business/message/send/')
        && $request['recipient'] === 'conv-1'
        && $request['text'] === ['body' => 'Chào bạn']);

    expect($outgoing->fresh()->source_id)->toBe('msg-out')
        ->and($outgoing->fresh()->status)->toBe(Message::STATUSES['delivered']);
});

it('trả lời trích dẫn bằng referenced_message_info', function () {
    Http::fake([
        'business-api.tiktok.com/*' => Http::response(['data' => ['message' => ['message_id' => 'msg-out']]]),
    ]);
    tiktokPost(ChannelFixture::load('tiktok_receive'));
    $quoted = Message::query()->latest('id')->first();
    $conversation = $quoted->conversation;

    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ còn ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/business/message/send/')
        && $request['referenced_message_info'] === ['referenced_message_id' => $quoted->source_id]);
});
