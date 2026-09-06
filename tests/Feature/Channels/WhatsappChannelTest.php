<?php

use App\Models\Inbox;
use App\Models\Message;
use App\Services\Whatsapp\Providers\Whatsapp360DialogService;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/whatsapp/incoming_message_whatsapp_cloud_service_spec.rb
// + spec/controllers/webhooks/whatsapp_controller_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->whatsapp()->create();
    $this->channel = $this->inbox->channel;
    $this->channel->update([
        'phone_number' => '+15551234567',
        'provider' => 'whatsapp_cloud',
        'provider_config' => [
            'api_key' => 'test-key',
            'phone_number_id' => '123456',
            'business_account_id' => '654321',
            'app_secret' => 'app-secret',
            'webhook_verify_token' => 'verify-me',
        ],
    ]);
});

function whatsappPost(array $payload, string $secret = 'app-secret'): TestResponse
{
    $body = json_encode($payload);

    return test()->call('POST', '/webhooks/whatsapp/'.urlencode('+15551234567'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, $secret),
    ], $body);
}

it('trả lời hub.challenge khi verify token khớp', function () {
    $this->get('/webhooks/whatsapp/'.urlencode('+15551234567').'?hub_verify_token=verify-me&hub_challenge=1234')
        ->assertOk()
        ->assertSee('1234');
});

it('từ chối verify khi token sai', function () {
    $this->get('/webhooks/whatsapp/'.urlencode('+15551234567').'?hub_verify_token=sai&hub_challenge=1234')
        ->assertStatus(401);
});

it('từ chối payload có chữ ký X-Hub-Signature-256 sai', function () {
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'), 'secret-sai')->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('tạo liên hệ, hội thoại và tin đến từ payload WhatsApp Cloud', function () {
    Http::fake();
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ WhatsApp')
        ->and($message->source_id)->toBe('wamid.SGVsbG8=')
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->conversation->contact->name)->toBe('Khách WhatsApp')
        ->and($message->conversation->contact->phone_number)->toBe('+15557654321');
});

it('không tạo trùng khi cùng một tin tới hai lần', function () {
    Http::fake();
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));

    expect(Message::query()->where('source_id', 'wamid.SGVsbG8=')->count())->toBe(1);
});

it('cập nhật trạng thái tin từ payload statuses', function () {
    Http::fake();
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));
    $message = Message::query()->latest('id')->first();

    whatsappPost(ChannelFixture::load('whatsapp_cloud_status'))->assertOk();

    expect($message->fresh()->status)->toBe(Message::STATUSES['delivered']);
});

it('gửi tin đi qua Cloud API và lưu source_id', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.OUT']]]),
    ]);
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/v13.0/123456/messages')
        && $request['to'] === '15557654321'
        && $request['text'] === ['body' => 'Chào bạn']);

    expect($outgoing->fresh()->source_id)->toBe('wamid.OUT');
});

it('đổi nhà cung cấp là đổi driver, không đụng lõi kênh', function () {
    $this->channel->update(['provider' => 'default', 'provider_config' => ['api_key' => '360-key']]);

    expect($this->channel->fresh()->providerService())
        ->toBeInstanceOf(Whatsapp360DialogService::class);
});
