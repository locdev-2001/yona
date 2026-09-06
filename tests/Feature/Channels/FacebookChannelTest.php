<?php

use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/builders/messages/facebook/message_builder_spec.rb +
// spec/jobs/webhooks/facebook_events_job_spec.rb (endpoint /bot của gem facebook-messenger).

beforeEach(function () {
    config()->set('services.facebook.app_secret', 'fb-secret');
    config()->set('services.facebook.verify_token', 'fb-verify');
    config()->set('services.facebook.app_id', 'chatwoot-app');
    $this->inbox = Inbox::factory()->facebookPage()->create();
    $this->inbox->channel->update(['page_id' => 'page-id']);
});

function facebookPost(array $payload, string $secret = 'fb-secret'): TestResponse
{
    $body = json_encode($payload);

    return test()->call('POST', '/bot', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, $secret),
    ], $body);
}

it('trả hub.challenge cho verify token của trang', function () {
    $this->get('/bot?hub_verify_token=fb-verify&hub_challenge=42')->assertOk()->assertSee('42');
});

it('từ chối payload ký sai', function () {
    facebookPost(ChannelFixture::load('facebook_messaging'), 'sai')->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('tạo liên hệ, hội thoại và tin đến từ Messenger', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['first_name' => 'Nguyễn', 'last_name' => 'An', 'profile_pic' => 'https://fb/pic.jpg']),
    ]);

    facebookPost(ChannelFixture::load('facebook_messaging'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ Messenger')
        ->and($message->source_id)->toBe('mid.facebook.1')
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->conversation->contact->name)->toBe('Nguyễn An')
        ->and($message->conversation->contactInbox->source_id)->toBe('sender-psid');
});

it('bỏ echo của chính tin Chatwoot vừa gửi', function () {
    Http::fake(['graph.facebook.com/*' => Http::response([])]);
    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message']['is_echo'] = true;
    $payload['entry'][0]['messaging'][0]['message']['app_id'] = 'chatwoot-app';
    $payload['entry'][0]['messaging'][0]['sender']['id'] = 'page-id';
    $payload['entry'][0]['messaging'][0]['recipient']['id'] = 'sender-psid';

    facebookPost($payload)->assertOk();

    expect(Message::query()->count())->toBe(0);
});

it('gửi tin đi qua Graph API và lưu source_id', function () {
    Http::fake([
        'graph.facebook.com/*/me/messages' => Http::response(['message_id' => 'mid.out']),
        'graph.facebook.com/*' => Http::response(['first_name' => 'Nguyễn', 'last_name' => 'An']),
    ]);
    facebookPost(ChannelFixture::load('facebook_messaging'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/me/messages')
        && $request['recipient'] === ['id' => 'sender-psid']
        && $request['message'] === ['text' => 'Chào bạn']);

    expect($outgoing->fresh()->source_id)->toBe('mid.out');
});
