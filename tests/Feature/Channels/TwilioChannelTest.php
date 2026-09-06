<?php

use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/twilio/{incoming_message_service,delivery_status_service}_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->twilioSms()->create();
    $this->channel = $this->inbox->channel;
    $this->channel->update([
        'account_sid' => 'ACtest',
        'auth_token' => 'twilio-secret',
        'phone_number' => '+15551234567',
        'messaging_service_sid' => null,
    ]);
});

function twilioPost(array $params, string $authToken = 'twilio-secret'): TestResponse
{
    ksort($params);
    $payload = url('/twilio/callback');

    foreach ($params as $key => $value) {
        $payload .= $key.$value;
    }

    return test()->post('/twilio/callback', $params, [
        'X-Twilio-Signature' => base64_encode(hash_hmac('sha1', $payload, $authToken, true)),
    ]);
}

it('tạo tin đến từ webhook Twilio đã ký đúng', function () {
    twilioPost(ChannelFixture::load('twilio_incoming'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ Twilio')
        ->and($message->source_id)->toBe('SM798e0d20d4baefdcac8b3b0d1bd93b26')
        ->and($message->conversation->contact->name)->toBe('Khách Twilio')
        ->and($message->conversation->contact->phone_number)->toBe('+15557654321');
});

it('từ chối webhook có chữ ký sai', function () {
    twilioPost(ChannelFixture::load('twilio_incoming'), 'sai-token')->assertStatus(401);

    expect(Message::query()->count())->toBe(0);
});

it('gửi tin đi qua REST API của Twilio', function () {
    Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SMoutgoing'])]);
    twilioPost(ChannelFixture::load('twilio_incoming'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/Accounts/ACtest/Messages.json')
        && $request['To'] === '+15557654321'
        && $request['From'] === '+15551234567'
        && $request['Body'] === 'Chào bạn');

    expect($outgoing->fresh()->source_id)->toBe('SMoutgoing');
});

it('thay tên số bằng ProfileName khi tin sau mới có tên', function () {
    $payload = ChannelFixture::load('twilio_incoming');
    unset($payload['ProfileName']);
    twilioPost($payload)->assertOk();

    $contact = Message::query()->latest('id')->first()->conversation->contact;
    expect($contact->name)->toBe('+15557654321');

    twilioPost(ChannelFixture::load('twilio_incoming'))->assertOk();

    expect($contact->refresh()->name)->toBe('Khách Twilio');
});

it('không đè tên đã được sửa tay bằng ProfileName', function () {
    twilioPost(ChannelFixture::load('twilio_incoming'))->assertOk();

    $contact = Message::query()->latest('id')->first()->conversation->contact;
    $contact->update(['name' => 'Tên do agent đặt']);

    twilioPost(ChannelFixture::load('twilio_incoming'))->assertOk();

    expect($contact->refresh()->name)->toBe('Tên do agent đặt');
});
