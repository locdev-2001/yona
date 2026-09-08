<?php

use App\Channels\Capability;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\MessageResource;
use App\Jobs\Webhooks\ZaloEventsJob;
use App\Jobs\Zalo\StopTypingJob;
use App\Models\Attachment;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Zalo\BridgeEventService;
use App\Services\Zalo\TypingRelayService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
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
    Http::fake([
        'cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
        // Bridge phải được giả ở ĐÂY chứ không riêng từng test: tin đi ra và việc
        // xoá inbox đều gọi bridge trong cùng request (QUEUE_CONNECTION=sync), nên
        // thiếu fake là suite gõ thẳng vào bridge THẬT của founder ở cầu nối cấu hình ở config/zalo.php.
        rtrim(config('zalo.bridge.url'), '/').'/*' => Http::response(['ok' => true]),
    ]);

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
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $quoted = Message::query()->latest('id')->first();

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->attachments()->count())->toBe(1)
        ->and($message->attachments()->first()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($message->content_attributes['in_reply_to_external_id'])->toBe('msg-zalo-1')
        ->and($message->content_attributes['in_reply_to'])->toBe($quoted->id);
});

it('hiển thị sticker bằng contract lõi: content_type sticker + đính kèm ảnh ngoài', function () {
    zaloWebhook(zaloPayload('zalo_inbound_sticker', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();
    $attachment = $message->attachments()->first();

    expect($message->content)->toBeNull()
        ->and($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
        ->and($message->content_attributes['sticker']['id'])->toBe(98930)
        ->and($attachment)->not->toBeNull()
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->external_url)->toBe('https://cdn.zalo.test/api/emoticon/sticker/webpc?eid=98930&size=130')
        ->and($attachment->pushEventData()['data_url'])
        ->toBe('https://cdn.zalo.test/api/emoticon/sticker/webpc?eid=98930&size=130');
});

it('bỏ qua sticker thiếu URL ảnh nhưng vẫn giữ content_type sticker', function () {
    zaloWebhook(zaloPayload('zalo_inbound_sticker', $this->channel, [
        'sticker' => ['id' => 1, 'text' => '[^1.1^]'],
    ]))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
        ->and($message->attachments()->count())->toBe(0);
});

it('giữ content_type text cho tin thường', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    expect(Message::query()->latest('id')->first()->content_type)->toBe(Message::CONTENT_TYPES['text']);
});

it('phát message.created với đính kèm đã có trong payload', function () {
    // Bug thật: tệp gắn SAU save nên payload realtime rỗng, FE không vẽ bong bóng
    // tới khi tải lại trang. Đọc payload ngay lúc phát (không phải lúc assert) để
    // bài test không tự cứu mình bằng lazy-load.
    $payloads = [];
    Event::listen(DomainEvent::class, function (DomainEvent $event) use (&$payloads) {
        if ($event->type === EventType::MESSAGE_CREATED) {
            $payloads[] = MessageResource::pushEventData($event->data['message']);
        }
    });

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel))->assertOk();

    expect($payloads)->toHaveCount(1)
        ->and($payloads[0]['attachments'] ?? [])->toHaveCount(1)
        ->and($payloads[0]['attachments'][0]['file_type'])->toBe('image');
});

it('bỏ qua tin trùng source_id kể cả khi hội thoại cũ đã đóng', function () {
    // Bridge khởi động lại đẩy lại lô old_messages: dedupe theo hội thoại sẽ nhét
    // tin cũ sang hội thoại mới của cùng liên hệ. Gốc tra theo inbox.
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    $conversation = Conversation::query()->latest('id')->first();
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, ['backfill' => true]))->assertOk();

    expect(Message::query()->where('source_id', 'msg-zalo-1')->count())->toBe(1)
        ->and(Conversation::query()->count())->toBe(1);
});

it('không dựng lại tin đã thu hồi khi kéo lịch sử về', function () {
    zaloWebhook(zaloPayload('zalo_backfill_undo', $this->channel))->assertOk();

    expect(Message::query()->count())->toBe(0);
});

it('hiển thị danh thiếp: content_attributes.business_card + nhãn thay cho nội dung rỗng', function () {
    zaloWebhook(zaloPayload('zalo_inbound_business_card', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content)->toBe(__('conversations.messages.business_card'))
        ->and($message->content_type)->toBe(Message::CONTENT_TYPES['text'])
        ->and($message->content_attributes['business_card']['name'])->toBe('Nguyễn Phước Lộc')
        ->and($message->content_attributes['business_card']['qr_code_url'])->toBe('https://cdn.zalo.test/qr/loc.jpg');
});

it('hiển thị thẻ ngân hàng: content_attributes.bank_card + nhãn', function () {
    zaloWebhook(zaloPayload('zalo_inbound_bank_card', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content)->toBe('[Tài khoản ngân hàng]')
        ->and($message->content_attributes['bank_card']['account_number'])->toBe('1027123456')
        ->and($message->content_attributes['bank_card']['bank_name'])->toBe('Vietcombank');
});

it('hiển thị cuộc gọi: content_attributes.call + nhãn', function () {
    zaloWebhook(zaloPayload('zalo_inbound_call', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content)->toBe(__('conversations.messages.call'))
        ->and($message->content_attributes['call']['outcome'])->toBe('missed')
        ->and($message->content_attributes['call']['media'])->toBe('voice');
});

it('dựng thẻ nhắc hẹn từ listener_data thay vì để lọt link ảnh thô', function () {
    zaloWebhook(zaloPayload('zalo_inbound_reminder', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();
    $reminder = $message->content_attributes['reminder'];

    expect($message->content)->toBe('Hẹn gọi tư vấn gói Team')
        ->and($message->content)->not->toContain('https://')
        ->and($reminder['title'])->toBe('Hẹn gọi tư vấn gói Team')
        ->and($reminder['description'])->toBe('Thứ Hai, 7 tháng 9 lúc 00:49')
        ->and($reminder['emoji'])->toBe('⏰')
        ->and($reminder['start_time'])->toBe(1788716940000);
});

it('không nhầm tin ecard thường thành nhắc hẹn', function () {
    $payload = ChannelFixture::load('zalo_inbound_reminder');
    $payload['listener_data']['content']['params'] = json_encode(['actions' => [['data' => '{"act":"open.link"}']]]);

    zaloWebhook([...$payload, 'connection_id' => $this->channel->connectionId()])->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content_attributes)->not->toHaveKey('reminder')
        ->and($message->content)->toStartWith('[Link]');
});

it('gắn đúng file_type cho video / âm thanh / tệp / gif', function (string $fixture, int $fileType) {
    zaloWebhook(zaloPayload($fixture, $this->channel))->assertOk();

    $attachment = Message::query()->latest('id')->first()->attachments()->first();

    expect($attachment)->not->toBeNull()
        ->and($attachment->file_type)->toBe($fileType);
})->with([
    ['zalo_inbound_video', Attachment::FILE_TYPE_VIDEO],
    ['zalo_inbound_audio', Attachment::FILE_TYPE_AUDIO],
    ['zalo_inbound_file', Attachment::FILE_TYPE_FILE],
    ['zalo_inbound_gif', Attachment::FILE_TYPE_IMAGE],
]);

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

// Tin đi của agent — cần có source_id để biên nhận/biểu cảm của bridge trỏ tới.
function zaloOutgoingWithSourceId(Conversation $conversation, string $sourceId): Message
{
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ có ạ. Gói Team 299k/tháng',
    ]);

    // SendReplyJob (sync) đã đánh hỏng tin vì bridge chưa kết nối — nạp lại rồi đặt lại.
    $message->refresh()->updateQuietly([
        'source_id' => $sourceId,
        'status' => Message::STATUSES['sent'],
        'content_attributes' => [],
    ]);

    return $message->refresh();
}

it('ghi biểu cảm lên đúng tin bị thả cảm xúc (rMsg.gMsgID), đổi mã zca thành emoji', function () {
    $this->freezeTime();
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_reaction', $this->channel))->assertOk();

    expect($outgoing->refresh()->reactionList())->toBe([['emoji' => '👍', 'by' => '9876543210', 'at' => now()->getTimestamp()]])
        // Tin đến KHÔNG được dính biểu cảm — msgId tầng ngoài là của chính sự kiện.
        ->and(Message::query()->where('source_id', 'msg-zalo-1')->first()->content_attributes)
        ->not->toHaveKey('reactions');
});

it('gỡ biểu cảm khi rIcon rỗng', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_reaction', $this->channel))->assertOk();
    expect($outgoing->refresh()->reactionList())->toHaveCount(1);

    $removal = ChannelFixture::load('zalo_relay_reaction');
    $removal['payload'][0]['data']['content']['rIcon'] = '';
    zaloWebhook([...$removal, 'connection_id' => $this->channel->connectionId()])->assertOk();

    expect($outgoing->refresh()->content_attributes['reactions'])->toBe([]);
});

it('thu hồi đúng tin theo content.globalMsgId và đánh dấu như tin bị xoá của lõi', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, ['source_id' => '8233984128820']))->assertOk();
    $message = Message::query()->latest('id')->first();

    zaloWebhook(zaloPayload('zalo_relay_undo', $this->channel))->assertOk();

    $message->refresh();
    expect($message->content)->toBe(__('conversations.messages.deleted'))
        ->and($message->content_type)->toBe(Message::CONTENT_TYPES['text'])
        ->and($message->content_attributes['deleted'])->toBeTrue();
});

it('đánh dấu đã nhận / đã xem theo biên nhận của bridge, chỉ nâng không hạ', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_delivered', $this->channel))->assertOk();
    expect($outgoing->refresh()->status)->toBe(Message::STATUSES['delivered']);

    zaloWebhook(zaloPayload('zalo_relay_seen', $this->channel))->assertOk();
    expect($outgoing->refresh()->status)->toBe(Message::STATUSES['read']);

    // Biên nhận "delivered" đến trễ không được kéo tick lùi.
    zaloWebhook(zaloPayload('zalo_relay_delivered', $this->channel))->assertOk();
    expect($outgoing->refresh()->status)->toBe(Message::STATUSES['read']);
});

it('phát message.updated khi biên nhận đổi trạng thái', function () {
    Event::fake([DomainEvent::class]);

    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_seen', $this->channel))->assertOk();

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::MESSAGE_UPDATED
    );
});

it('nối tin trích dẫn qua cliMsgId về source_id rồi để lõi đặt in_reply_to', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    $quoted = zaloOutgoingWithSourceId($conversation, 'msg-zalo-out-1');
    // cliMsgId chỉ nền tảng biết — về qua tin echo của chính tin vừa gửi.
    $quoted->updateQuietly(['content_attributes' => ['zca_message' => ['msgId' => 'msg-zalo-out-1', 'cliMsgId' => '1788714913519']]]);

    zaloWebhook(zaloPayload('zalo_inbound_quote', $this->channel))->assertOk();

    $reply = Message::query()->where('source_id', 'msg-zalo-quote-1')->first();
    expect($reply->content_attributes['in_reply_to_external_id'])->toBe('msg-zalo-out-1')
        ->and($reply->content_attributes['in_reply_to'])->toBe($quoted->id)
        ->and($reply->content_attributes['zca_message']['cliMsgId'])->toBe('1788714970591');
});

it('ghi bổ sung zca_message cho tin đã có khi bridge dội lại (echo)', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    $sent = zaloOutgoingWithSourceId($conversation, 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_inbound_quote', $this->channel, [
        'source_id' => 'msg-zalo-out-1',
        'direction' => 'echo',
        'quote' => null,
    ]))->assertOk();

    expect($conversation->messages()->where('source_id', 'msg-zalo-out-1')->count())->toBe(1)
        ->and($sent->refresh()->content_attributes['zca_message']['cliMsgId'])->toBe('1788714970591');
});

it('bỏ qua sự kiện của kênh không tồn tại', function () {
    (new ZaloEventsJob(zaloPayload('zalo_inbound_text', $this->channel, ['connection_id' => 999999])))
        ->handle(app(BridgeEventService::class));

    expect(Conversation::query()->count())->toBe(0);
});

it('không gán số trên danh thiếp của người khác cho người gửi', function () {
    // Chủ số trên thiếp đã có hồ sơ riêng: nhận nhầm số thiếp là hội thoại của
    // người gửi bị đổ vào hồ sơ của NGƯỜI KHÁC.
    $cardOwner = Contact::factory()->create([
        'account_id' => $this->inbox->account_id,
        'phone_number' => '+84912345678',
        'name' => 'Nguyễn Phước Lộc',
    ]);

    zaloWebhook(zaloPayload('zalo_inbound_business_card', $this->channel, [
        'business_card' => [
            ...ChannelFixture::load('zalo_inbound_business_card')['business_card'],
            'phone' => '+84912345678',
        ],
    ]))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->conversation->contact_id)->not->toBe($cardOwner->id)
        ->and($message->conversation->contact->phone_number)->toBeNull()
        // Số vẫn còn nguyên trong thẻ để agent gọi được — chỉ không phải số của người gửi.
        ->and($message->content_attributes['business_card']['phone'])->toBe('+84912345678');
});

it('nhận số trên danh thiếp khi đó là thiếp của chính người gửi', function () {
    zaloWebhook(zaloPayload('zalo_inbound_business_card', $this->channel, [
        'business_card' => [
            ...ChannelFixture::load('zalo_inbound_business_card')['business_card'],
            'contact_uid' => '9876543210',
        ],
    ]))->assertOk();

    expect(Message::query()->latest('id')->first()->conversation->contact->phone_number)->toBe('+84912345678');
});

it('quy số nội địa về E.164 thay vì để lõi nuốt im lặng', function (string $raw) {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => $raw],
    ]))->assertOk();

    expect(Message::query()->latest('id')->first()->conversation->contact->phone_number)->toBe('+84901234567');
})->with(['0901234567', '090 123 4567', '84901234567', '+84901234567']);

it('bỏ số không rõ mã quốc gia thay vì đoán bừa', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => '901234567'],
    ]))->assertOk();

    expect(Message::query()->latest('id')->first()->conversation->contact->phone_number)->toBeNull();
});

it('điền số vào hồ sơ đang trống ở tin sau, không đè số agent đã nhập', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $contact = Message::query()->latest('id')->first()->conversation->contact;
    expect($contact->phone_number)->toBeNull();

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => '0901234567'],
    ]))->assertOk();
    expect($contact->refresh()->phone_number)->toBe('+84901234567');

    $contact->update(['phone_number' => '+84900000000']);

    zaloWebhook(zaloPayload('zalo_inbound_video', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => '0901234567'],
    ]))->assertOk();

    expect($contact->refresh()->phone_number)->toBe('+84900000000');
});

it('gộp qua ContactMergeAction khi số đến sau đã thuộc hồ sơ khác', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $zaloContact = Message::query()->latest('id')->first()->conversation->contact;

    $owner = Contact::factory()->create([
        'account_id' => $this->inbox->account_id,
        'phone_number' => '+84901234567',
        'name' => 'Chị Lan (nhập tay)',
    ]);

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'user' => ['name' => 'Nguyễn Văn A', 'phone' => '0901234567'],
    ]))->assertOk();

    expect(Contact::query()->whereKey($zaloContact->id)->exists())->toBeFalse()
        ->and(Contact::query()->where('account_id', $this->inbox->account_id)->count())->toBe(1)
        ->and($owner->refresh()->additional_attributes['social_zalo_user_id'])->toBe('9876543210')
        ->and(Message::query()->latest('id')->first()->conversation->contact_id)->toBe($owner->id);
});

it('cùng khách ở inbox Zalo thứ hai về đúng một hồ sơ', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    $second = Inbox::factory()->zalo()->create(['account_id' => $this->inbox->account_id]);

    zaloWebhook(zaloPayload('zalo_inbound_image', $second->channel))->assertOk();

    expect(Contact::query()->where('account_id', $this->inbox->account_id)->count())->toBe(1)
        ->and(Conversation::query()->count())->toBe(2);
});

it('xoá inbox rồi tạo lại vẫn về đúng hồ sơ cũ theo uid Zalo', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $contact = Message::query()->latest('id')->first()->conversation->contact;

    $this->inbox->delete();
    $rebuilt = Inbox::factory()->zalo()->create(['account_id' => $contact->account_id]);

    zaloWebhook(zaloPayload('zalo_inbound_image', $rebuilt->channel))->assertOk();

    expect(Contact::query()->where('account_id', $contact->account_id)->count())->toBe(1)
        ->and(Message::query()->latest('id')->first()->conversation->contact_id)->toBe($contact->id);
});

it('làm mới tên khách khi bridge chỉ mới đặt tên tạm, giữ tên agent sửa tay', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'user' => ['name' => 'Zalo User', 'avatar' => null],
    ]))->assertOk();
    $contact = Message::query()->latest('id')->first()->conversation->contact;
    expect($contact->name)->toBe('Zalo User');

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel))->assertOk();
    expect($contact->refresh()->name)->toBe('Nguyễn Văn A');

    $contact->update(['name' => 'Anh A - khách sỉ']);

    zaloWebhook(zaloPayload('zalo_inbound_video', $this->channel))->assertOk();

    expect($contact->refresh()->name)->toBe('Anh A - khách sỉ');
});

it('xếp tin theo giờ nền tảng và không bơm chưa đọc khi kéo lịch sử về', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    $conversation->update(['agent_last_seen_at' => now()]);

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'source_id' => 'msg-zalo-old',
        'platform_sent_at' => 1719400000000,
        'backfill' => true,
        'quote' => null,
    ]))->assertOk();

    $backfilled = Message::query()->where('source_id', 'msg-zalo-old')->first();

    expect($backfilled->created_at->getTimestampMs())->toBe(1719400000000)
        ->and($backfilled->created_at->lessThan(Message::query()->where('source_id', 'msg-zalo-1')->first()->created_at))->toBeTrue()
        ->and($conversation->refresh()->unreadIncomingMessagesCount())->toBe(0);
});

it('tin lịch sử không mở lại hội thoại đã đóng và không dời mốc chờ', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);
    $conversation->refresh();
    $lastActivityAt = $conversation->last_activity_at;

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'source_id' => 'msg-zalo-old',
        'platform_sent_at' => 1719400000000,
        'backfill' => true,
        'quote' => null,
    ]))->assertOk();

    $conversation->refresh();

    expect($conversation->status)->toBe(Conversation::STATUS_RESOLVED)
        ->and($conversation->waiting_since)->toBeNull()
        ->and($conversation->last_activity_at->equalTo($lastActivityAt))->toBeTrue();
});

it('coi tin chủ shop gửi từ điện thoại là đã trả lời: external_echo + hết mốc chờ', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    expect($conversation->waiting_since)->not->toBeNull();

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'source_id' => 'msg-zalo-from-phone',
        'direction' => 'out',
        'quote' => null,
    ]))->assertOk();

    $message = Message::query()->where('source_id', 'msg-zalo-from-phone')->first();

    expect($message->message_type)->toBe(Message::TYPE_OUTGOING)
        ->and($message->content_attributes['external_echo'])->toBeTrue()
        ->and($conversation->refresh()->waiting_since)->toBeNull()
        ->and($conversation->first_reply_created_at)->not->toBeNull();
});

it('dedupe theo mọi msgId chiều ra đã ghi trong external_source_ids', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();
    $sent = zaloOutgoingWithSourceId($conversation, 'msg-zalo-out-1');
    // Ảnh + chú thích: zca trả 2 msgId, chiều ra ghi cả hai.
    $sent->updateQuietly(['content_attributes' => ['external_source_ids' => ['msg-zalo-out-1', 'msg-zalo-out-2']]]);

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, [
        'source_id' => 'msg-zalo-out-2',
        'direction' => 'echo',
        'quote' => null,
    ]))->assertOk();

    expect(Message::query()->where('source_id', 'msg-zalo-out-2')->count())->toBe(0)
        ->and($conversation->messages()->count())->toBe(2);
});

it('đưa vị trí vào contract location của lõi', function () {
    zaloWebhook(zaloPayload('zalo_inbound_location', $this->channel))->assertOk();

    $attachment = Message::query()->latest('id')->first()->attachments()->first();

    expect($attachment)->not->toBeNull()
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_LOCATION)
        ->and((float) $attachment->coordinates_lat)->toBe(10.762622)
        ->and((float) $attachment->coordinates_long)->toBe(106.660172)
        ->and($attachment->fallback_title)->toBe('Chợ Bến Thành, Lê Lợi, Quận 1, TP.HCM');
});

it('đưa link vào contract fallback của lõi thay cho chuỗi [Link] thô', function () {
    zaloWebhook(zaloPayload('zalo_inbound_link', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();
    $attachment = $message->attachments()->first();

    expect($attachment)->not->toBeNull()
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBe('https://yona.vn/bang-gia')
        ->and($attachment->fallback_title)->toBe('Bảng giá Yona')
        ->and($message->content)->toBe('Anh xem giúp em');
});

it('giữ dấu vết tệp khi URL CDN đã hết hạn thay vì lưu tin rỗng', function () {
    // Stub của beforeEach chỉ khớp cdn.zalo.test; URL hết hạn dùng host khác để
    // stub 403 này thắng.
    Http::fake(['cdn.het-han.test/*' => Http::response('', 403)]);

    zaloWebhook(zaloPayload('zalo_inbound_file', $this->channel, [
        'media_url' => 'https://cdn.het-han.test/bang-gia.txt',
    ]))->assertOk();

    $attachment = Message::query()->latest('id')->first()->attachments()->first();

    expect($attachment)->not->toBeNull()
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBe('https://cdn.het-han.test/bang-gia.txt');
});

// ─── Lô 4: sự kiện & trạng thái tin ────────────────────────────────────────────

it('thu hồi xoá luôn đính kèm và tệp trên đĩa, không để lại trong tab Media', function () {
    Storage::fake('public');

    zaloWebhook(zaloPayload('zalo_inbound_image', $this->channel, ['source_id' => '8233984128820']))->assertOk();
    $message = Message::query()->latest('id')->first();
    $path = $message->attachments()->first()->path;

    expect($message->attachments()->count())->toBe(1)
        ->and(Storage::disk('public')->exists($path))->toBeTrue();

    zaloWebhook(zaloPayload('zalo_relay_undo', $this->channel))->assertOk();

    expect($message->refresh()->attachments()->count())->toBe(0)
        ->and(Storage::disk('public')->exists($path))->toBeFalse()
        ->and($message->content_attributes)->toBe(['deleted' => true]);
});

it('áp thu hồi cho tin đến SAU khi sự kiện undo đã tới trước', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();

    // Sự kiện undo tới trước tin của nó (hai đường HTTP, hai lượt hàng đợi).
    zaloWebhook(zaloPayload('zalo_relay_undo', $this->channel))->assertOk();
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'source_id' => '8233984128820',
        'content' => 'Tin gửi nhầm',
    ]))->assertOk();

    $message = Message::query()->where('source_id', '8233984128820')->first();

    expect($message->content)->toBe(__('conversations.messages.deleted'))
        ->and($message->content_attributes['deleted'])->toBeTrue();
});

it('đổi biểu cảm của cùng một người thành MỘT mục, không cộng dồn', function () {
    $this->freezeTime();
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_reaction', $this->channel))->assertOk();

    $changed = ChannelFixture::load('zalo_relay_reaction');
    $changed['payload'][0]['data']['content']['rIcon'] = '/-heart';
    zaloWebhook([...$changed, 'connection_id' => $this->channel->connectionId()])->assertOk();

    expect($outgoing->refresh()->reactionList())->toBe([
        ['emoji' => '❤️', 'by' => '9876543210', 'at' => now()->getTimestamp()],
    ]);
});

it('người này gỡ biểu cảm không xoá biểu cảm của người kia', function () {
    $this->freezeTime();
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    zaloWebhook(zaloPayload('zalo_relay_reaction', $this->channel))->assertOk();

    $other = ChannelFixture::load('zalo_relay_reaction');
    $other['payload'][0]['data']['uidFrom'] = '1112223330';
    $other['payload'][0]['data']['content']['rIcon'] = '/-heart';
    zaloWebhook([...$other, 'connection_id' => $this->channel->connectionId()])->assertOk();
    expect($outgoing->refresh()->reactionList())->toHaveCount(2);

    // Người thứ hai gỡ — người đầu vẫn giữ 👍.
    $other['payload'][0]['data']['content']['rIcon'] = '';
    zaloWebhook([...$other, 'connection_id' => $this->channel->connectionId()])->assertOk();

    expect($outgoing->refresh()->reactionList())->toBe([
        ['emoji' => '👍', 'by' => '9876543210', 'at' => now()->getTimestamp()],
    ]);
});

it('nâng cấp mảng emoji phẳng cũ sang cấu trúc {emoji, by, at} ngay lúc đọc', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');
    $outgoing->updateQuietly(['content_attributes' => ['reactions' => ['👍']]]);

    expect($outgoing->refresh()->reactionList())
        ->toBe([['emoji' => '👍', 'by' => Message::REACTION_BY_UNKNOWN, 'at' => 0]]);
});

it('bỏ biên nhận do chính tài khoản của tenant sinh ra (isSelf) và biên nhận cho tin đến', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $incoming = Message::query()->where('source_id', 'msg-zalo-1')->first();
    $outgoing = zaloOutgoingWithSourceId(Conversation::query()->latest('id')->first(), 'msg-zalo-out-1');

    $selfSeen = ChannelFixture::load('zalo_relay_seen');
    $selfSeen['payload'][0][0]['isSelf'] = true;
    zaloWebhook([...$selfSeen, 'connection_id' => $this->channel->connectionId()])->assertOk();
    expect($outgoing->refresh()->status)->toBe(Message::STATUSES['sent']);

    // Biên nhận trỏ vào một tin ĐẾN cũng không được đổi gì (tin đến không có tick).
    $onIncoming = ChannelFixture::load('zalo_relay_seen');
    $onIncoming['payload'][0][0]['data']['msgId'] = 'msg-zalo-1';
    zaloWebhook([...$onIncoming, 'connection_id' => $this->channel->connectionId()])->assertOk();

    expect($incoming->refresh()->status)->toBe(Message::STATUSES['sent']);
});

it('khách đang gõ thì phát conversation.typing_on rồi tự tắt sau vài giây', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();

    // Chỉ giả job tắt: ZaloEventsJob vẫn phải chạy thật để sự kiện typing được xử lý.
    Queue::fake([StopTypingJob::class]);
    Event::fake([DomainEvent::class]);

    zaloWebhook([
        'type' => 'relay_event',
        'event_type' => 'typing',
        'connection_id' => $this->channel->connectionId(),
        'payload' => [['type' => 0, 'data' => ['uid' => '9876543210', 'ts' => '1788715049561', 'isPC' => 0], 'threadId' => '9876543210', 'isSelf' => false]],
    ])->assertOk();

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON
            && $event->data['conversation']->id === $conversation->id
            && $event->data['user']->id === $conversation->contact_id,
    );
    // Zalo chỉ phát MỘT sự kiện typing cho cả lượt gõ nên cửa sổ chờ phải đủ dài,
    // và phải lấy từ cấu hình (config/zalo.php → typing_off_delay).
    Queue::assertPushed(
        StopTypingJob::class,
        fn (StopTypingJob $job) => $job->delay instanceof DateTimeInterface
            && (int) round(now()->diffInSeconds($job->delay, absolute: true)) === 10,
    );
});

it('cửa sổ chờ tắt đang-nhập lấy từ cấu hình, không phải số cứng', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    config(['zalo.typing_off_delay' => 17]);
    Queue::fake([StopTypingJob::class]);

    zaloWebhook([
        'type' => 'relay_event',
        'event_type' => 'typing',
        'connection_id' => $this->channel->connectionId(),
        'payload' => [['type' => 0, 'data' => ['uid' => '9876543210'], 'threadId' => '9876543210', 'isSelf' => false]],
    ])->assertOk();

    Queue::assertPushed(
        StopTypingJob::class,
        fn (StopTypingJob $job) => (int) round(now()->diffInSeconds($job->delay, absolute: true)) === 17,
    );
});

it('không bật đang-nhập cho luồng chưa có hội thoại nào', function () {
    Event::fake([DomainEvent::class]);

    zaloWebhook([
        'type' => 'relay_event',
        'event_type' => 'typing',
        'connection_id' => $this->channel->connectionId(),
        'payload' => [['data' => ['uid' => 'nguoi-la'], 'threadId' => 'nguoi-la', 'isSelf' => false]],
    ])->assertOk();

    Event::assertNotDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON,
    );
});

it('job tắt đang-nhập bỏ qua khi khách vừa gõ tiếp', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel))->assertOk();
    $conversation = Conversation::query()->latest('id')->first();

    Cache::put(TypingRelayService::stampKey($conversation), 'moi-hon', now()->addMinute());
    Event::fake([DomainEvent::class]);

    (new StopTypingJob($conversation, 'cu-hon'))->handle(app(TypingRelayService::class));

    Event::assertNotDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_OFF,
    );

    (new StopTypingJob($conversation, 'moi-hon'))->handle(app(TypingRelayService::class));

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_OFF,
    );
});

// ── Lô 2b: tin nhóm (Q3) · lời mời kết bạn (Q7) · nhắc hẹn tới giờ ────────────

it('gom mọi tin của một nhóm vào MỘT hội thoại mang tên và ảnh nhóm', function () {
    zaloWebhook(zaloPayload('zalo_inbound_group_text', $this->channel))->assertOk();
    zaloWebhook(zaloPayload('zalo_inbound_group_text', $this->channel, [
        'source_id' => 'msg-zalo-group-2',
        'content' => 'Ok em xem ngay',
        'sender_uid' => '555000222',
        'sender' => ['external_id' => '555000222', 'name' => 'Bình', 'avatar' => null],
        'mentions' => [],
    ]))->assertOk();

    $conversations = Conversation::query()->get();
    $contact = $conversations->first()->contact;

    expect($conversations)->toHaveCount(1)
        ->and($conversations->first()->messages()->count())->toBe(2)
        ->and($contact->name)->toBe('Nhóm Bán Hàng')
        ->and($contact->additional_attributes['zalo_thread_type'])->toBe('group')
        ->and($contact->additional_attributes['social_zalo_user_id'])->toBe('7788')
        ->and($conversations->first()->additional_attributes['thread_type'])->toBe(1);
});

it('giữ người gửi, nhắc tên và nhóm theo khoá chuẩn của năng lực group_threads', function () {
    zaloWebhook(zaloPayload('zalo_inbound_group_text', $this->channel))->assertOk();

    $attributes = Message::query()->latest('id')->first()->content_attributes;

    expect($attributes['sender'])->toBe([
        'external_id' => '555000111',
        'name' => 'Minh Anh',
        'avatar' => 'https://cdn.zalo.test/minh-anh.jpg',
    ])
        ->and($attributes['thread'])->toBe([
            'id' => '7788',
            'name' => 'Nhóm Bán Hàng',
            'avatar' => 'https://cdn.zalo.test/group-7788.jpg',
        ])
        ->and($attributes['mentions'])->toBe([[
            'external_id' => '555000222',
            'name' => 'Bình',
            'offset' => 0,
            'length' => 5,
        ]]);
});

it('bỏ khoá lạ của nền tảng trong ngữ cảnh nhóm thay vì bê nguyên vào lõi', function () {
    zaloWebhook(zaloPayload('zalo_inbound_group_text', $this->channel, [
        'thread' => ['type' => 'group', 'id' => '7788', 'name' => 'Nhóm Bán Hàng', 'groupType' => 2],
        'sender' => ['external_id' => '555000111', 'name' => 'Minh Anh', 'zaloGlobalId' => 'x'],
        'mentions' => [['external_id' => '555000222', 'name' => 'Bình', 'offset' => 0, 'length' => 5, 'type' => 0]],
    ]))->assertOk();

    $attributes = Message::query()->latest('id')->first()->content_attributes;

    expect(array_keys($attributes['thread']))->toBe(['id', 'name'])
        ->and(array_keys($attributes['sender']))->toBe(['external_id', 'name'])
        ->and(array_keys($attributes['mentions'][0]))->toBe(['external_id', 'name', 'offset', 'length']);
});

it('không gắn ngữ cảnh nhóm vào chat 1-1', function () {
    zaloWebhook(zaloPayload('zalo_inbound_text', $this->channel, [
        'thread' => ['type' => 'group', 'id' => '7788', 'name' => 'Nhóm Bán Hàng'],
        'sender' => ['external_id' => '555000111', 'name' => 'Minh Anh'],
    ]))->assertOk();

    $attributes = Message::query()->latest('id')->first()->content_attributes;

    expect($attributes)->not->toHaveKey('thread')
        ->and($attributes)->not->toHaveKey('sender');
});

it('coi tin của chính tài khoản shop trong nhóm là tin đi đã dội lại', function () {
    zaloWebhook(zaloPayload('zalo_inbound_group_text', $this->channel, [
        'source_id' => 'msg-zalo-group-self',
        'is_self' => true,
        'direction' => 'out',
        'sender_uid' => '1234567890',
        'sender' => ['external_id' => '1234567890', 'name' => 'Shop Yona', 'avatar' => null],
        'mentions' => [],
        'content' => 'Đơn này giao chiều nay nhé cả nhà',
    ]))->assertOk();

    $message = Message::query()->where('source_id', 'msg-zalo-group-self')->first();

    expect($message->message_type)->toBe(Message::TYPE_OUTGOING)
        ->and($message->content_attributes['external_echo'])->toBeTrue()
        ->and($message->content_attributes['sender']['name'])->toBe('Shop Yona')
        ->and($message->sender_id)->toBeNull();
});

it('khai báo năng lực nhóm và lời mời kết bạn', function () {
    expect($this->inbox->supports(Capability::GroupThreads))->toBeTrue()
        ->and($this->inbox->supports(Capability::FriendRequest))->toBeTrue();
});

it('lời mời kết bạn dựng Liên hệ nháp + hội thoại, không phải Lead', function () {
    zaloWebhook(zaloPayload('zalo_friend_request', $this->channel))->assertOk();

    $message = Message::query()->latest('id')->first();
    $contact = $message->conversation->contact;

    expect($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->source_id)->toBe('zalo-personal-friend-request-1')
        ->and($message->content)->toBe('Chào shop, mình muốn hỏi giá gói Team')
        ->and($message->content_attributes['friend_request'])->toBe([
            'external_id' => '5550001234',
            'message' => 'Chào shop, mình muốn hỏi giá gói Team',
        ])
        ->and($contact->name)->toBe('Trần Thị B')
        ->and($contact->contactTypeName())->toBe('visitor')
        ->and($contact->contactInboxes()->first()->source_id)->toBe('5550001234');
});

it('lời mời kết bạn không có lời nhắn vẫn hiện nhãn ở card hội thoại', function () {
    zaloWebhook(zaloPayload('zalo_friend_request', $this->channel, ['message' => null]))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content)->toBe(__('conversations.messages.friend_request'))
        ->and($message->content_attributes['friend_request'])->toBe(['external_id' => '5550001234']);
});

it('bỏ qua lời mời kết bạn gửi lại cùng source_id', function () {
    zaloWebhook(zaloPayload('zalo_friend_request', $this->channel))->assertOk();
    zaloWebhook(zaloPayload('zalo_friend_request', $this->channel))->assertOk();

    expect(Message::query()->count())->toBe(1)
        ->and(Contact::query()->count())->toBe(1);
});

it('bỏ qua lời mời kết bạn thiếu uid người mời', function () {
    zaloWebhook(zaloPayload('zalo_friend_request', $this->channel, ['user' => ['name' => 'Ẩn danh']]))->assertOk();

    expect(Message::query()->count())->toBe(0);
});

it('tin nhắc hẹn tới giờ về cùng thẻ nhắc hẹn với tin lúc tạo', function () {
    $payload = zaloPayload('zalo_inbound_reminder', $this->channel, ['source_id' => 'msg-zalo-reminder-due']);
    $payload['listener_data']['content']['params'] = str_replace(
        'create_reminder11',
        'remind_reminder11',
        $payload['listener_data']['content']['params'],
    );

    zaloWebhook($payload)->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content_attributes['reminder']['title'])->toBe('Hẹn gọi tư vấn gói Team')
        ->and($message->content)->toBe('Hẹn gọi tư vấn gói Team');
});
