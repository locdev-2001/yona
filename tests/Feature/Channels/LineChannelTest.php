<?php

use App\Models\Inbox;
use App\Models\Message;
use App\Services\Line\SendOnLineService;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/line/incoming_message_service_spec.rb +
// spec/controllers/webhooks/line_controller_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->line()->create();
    $this->channel = $this->inbox->channel;
});

function fakeLineApi(array $overrides = []): void
{
    Http::fake([
        'api.line.me/v2/bot/profile/*' => Http::response([
            'userId' => 'U4af4980629',
            'displayName' => 'Khách LINE',
            'pictureUrl' => 'https://line.example/avatar.jpg',
        ]),
        'api-data.line.me/*' => Http::response('binary', 200, ['Content-Type' => 'image/jpeg']),
        'api.line.me/v2/bot/message/push' => Http::response([]),
        ...$overrides,
    ]);
}

function lineSignature(string $secret, string $body): string
{
    return base64_encode(hash_hmac('sha256', $body, $secret, true));
}

it('tạo hội thoại và tin đến từ webhook LINE có chữ ký hợp lệ', function () {
    fakeLineApi();
    $payload = ChannelFixture::load('line_text');
    $body = json_encode($payload);

    $this->call(
        'POST',
        "/webhooks/line/{$this->channel->line_channel_id}",
        [],
        [],
        [],
        ['CONTENT_TYPE' => 'application/json', 'HTTP_X_LINE_SIGNATURE' => lineSignature($this->channel->line_channel_secret, $body)],
        $body,
    )->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Hello, world')
        ->and($message->source_id)->toBe('14353798921116')
        ->and($message->conversation->contact->name)->toBe('Khách LINE')
        ->and($message->conversation->contactInbox->source_id)->toBe('U4af4980629');
});

it('bỏ payload có chữ ký sai', function () {
    fakeLineApi();
    $payload = ChannelFixture::load('line_text');
    $body = json_encode($payload);

    $this->call(
        'POST',
        "/webhooks/line/{$this->channel->line_channel_id}",
        [], [], [],
        ['CONTENT_TYPE' => 'application/json', 'HTTP_X_LINE_SIGNATURE' => 'chu-ky-sai'],
        $body,
    )->assertOk();

    expect(Message::query()->count())->toBe(0);
});

it('gửi tin đi bằng push message', function () {
    fakeLineApi();
    $payload = ChannelFixture::load('line_text');
    $body = json_encode($payload);
    $this->call('POST', "/webhooks/line/{$this->channel->line_channel_id}", [], [], [],
        ['CONTENT_TYPE' => 'application/json', 'HTTP_X_LINE_SIGNATURE' => lineSignature($this->channel->line_channel_secret, $body)], $body);

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    (new SendOnLineService($outgoing))->perform();

    Http::assertSent(fn ($request) => $request->url() === 'https://api.line.me/v2/bot/message/push'
        && $request['to'] === 'U4af4980629'
        && $request['messages'][0] === ['type' => 'text', 'text' => 'Chào bạn']);

    expect($outgoing->fresh()->status)->toBe(Message::STATUSES['delivered']);
});
