<?php

use App\Jobs\Webhooks\ZaloEventsJob;
use App\Models\Attachment;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Zalo\BridgeEventService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Không có tài khoản Zalo để quét QR nên bridge được giả bằng Http::fake();
// payload webhook lấy đúng hợp đồng docs/zalo-bridge/webhook-contract.md.

function zaloWebhook(array $payload, ?string $secret = null): TestResponse
{
    return test()->postJson('/webhooks/zalo', $payload, [
        'X-Zalo-Personal-Bridge-Secret' => $secret ?? config('zalo.bridge.webhook_secret'),
    ]);
}

/** @return array<string, mixed> */
function zaloPayload(string $fixture, Zalo $channel, array $overrides = []): array
{
    return [...ChannelFixture::load($fixture), 'connection_id' => $channel->connectionId(), ...$overrides];
}

beforeEach(function () {
    config()->set('zalo.bridge.webhook_secret', 'secret-bridge');
    Http::fake(['cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg'])]);

    $this->inbox = Inbox::factory()->zalo()->create();
    $this->channel = $this->inbox->channel;
});

it('từ chối webhook khi secret không khớp', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel), 'sai-secret')->assertUnauthorized();
});

it('từ chối webhook khi secret chưa được cấu hình', function () {
    config()->set('zalo.bridge.webhook_secret', '');

    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel), '')->assertUnauthorized();
});

it('trả 400 khi thiếu connection_id', function () {
    zaloWebhook(['type' => 'inbound'])->assertStatus(400);
});

it('đẩy payload vào hàng đợi thay vì xử lý trong request', function () {
    Bus::fake();

    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    Bus::assertDispatched(ZaloEventsJob::class);
});

it('nhận tin đến và dựng liên hệ + hội thoại + tin nhắn', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào')
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->source_id)->toBe('msg-zalo-1')
        ->and($message->conversation->contact->name)->toBe('Nguyễn Văn A')
        ->and($message->conversation->contactInbox->source_id)->toBe('9876543210')
        ->and($message->conversation->additional_attributes['thread_id'])->toBe('9876543210');
});

it('bỏ qua tin trùng source_id', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    expect(Message::query()->count())->toBe(1);
});

it('gộp về hồ sơ đã có khi trùng số điện thoại', function () {
    $existing = Contact::factory()->create([
        'account_id' => $this->inbox->account_id,
        'phone_number' => '+84901234567',
    ]);

    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => '+84901234567'],
    ]))->assertOk();

    expect(Contact::query()->where('account_id', $this->inbox->account_id)->count())->toBe(1)
        ->and(Message::query()->latest('id')->first()->conversation->contact_id)->toBe($existing->id);
});

it('ghi tin do điện thoại tenant gửi là tin đi', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, ['direction' => 'out']))->assertOk();

    expect(Message::query()->latest('id')->first()->message_type)->toBe(Message::TYPE_OUTGOING);
});

it('coi direction lạ là tin đến', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, ['direction' => 'khong-biet']))->assertOk();

    expect(Message::query()->latest('id')->first()->message_type)->toBe(Message::TYPE_INCOMING);
});

it('tải tệp đính kèm và giữ trích dẫn trong content_attributes', function () {
    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->attachments()->count())->toBe(1)
        ->and($message->attachments()->first()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($message->content_attributes['in_reply_to_external_id'])->toBe('msg-zalo-1');
});

it('cập nhật trạng thái phiên từ sự kiện bridge_session', function () {
    zaloWebhook(zaloPayload('zalo_bridge_session', $this->channel))->assertOk();

    $this->channel->refresh();

    expect($this->channel->state)->toBe(Zalo::STATE_SESSION_LOST)
        ->and($this->channel->session_lost_reason)->toBe('cookie expired')
        ->and($this->channel->last_session_lost_at)->not->toBeNull();

    zaloWebhook(zaloPayload('zalo_bridge_session', $this->channel, ['state' => 'session_ok', 'detail' => null]))->assertOk();

    $this->channel->refresh();

    expect($this->channel->state)->toBe(Zalo::STATE_CONNECTED)
        ->and($this->channel->session_lost_reason)->toBeNull()
        ->and($this->channel->last_session_lost_at)->not->toBeNull();
});

it('ghi biểu cảm và thu hồi tin theo sự kiện relay', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    zaloWebhook(zaloPayload('zalo_relay_reaction', $this->channel))->assertOk();
    $message = Message::query()->latest('id')->first();
    expect($message->content_attributes['reactions'])->toBe(['/-heart']);

    zaloWebhook([
        'type' => 'relay_event',
        'event_type' => 'undo',
        'connection_id' => $this->channel->connectionId(),
        'payload' => ['msgId' => 'msg-zalo-1'],
    ])->assertOk();

    $message->refresh();
    expect($message->content)->toBeNull()
        ->and($message->content_attributes['deleted'])->toBeTrue();
});

it('đánh dấu đã xem theo biên nhận của bridge', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    zaloWebhook([
        'type' => 'relay_event',
        'event_type' => 'seen_messages',
        'connection_id' => $this->channel->connectionId(),
        'payload' => ['msgIds' => ['msg-zalo-1']],
    ])->assertOk();

    expect(Message::query()->latest('id')->first()->status)->toBe(Message::STATUSES['read']);
});

it('bỏ qua sự kiện của kênh không tồn tại', function () {
    (new ZaloEventsJob(zaloPayload('zalo_inbound_text', $this->channel, ['connection_id' => 999999])))
        ->handle(app(BridgeEventService::class));

    expect(Conversation::query()->count())->toBe(0);
});
