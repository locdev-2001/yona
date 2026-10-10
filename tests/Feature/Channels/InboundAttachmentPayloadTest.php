<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\MessageResource;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Facebook\MessageCreator;
use App\Services\Facebook\MessageParser;
use App\Services\Telegram\IncomingMessageService;
use App\Services\Tiktok\MessageService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Channels\ChannelFixture;

/**
 * Khoá chung cho MỌI kênh đến: đính kèm phải có mặt trong payload
 * `message.created` NGAY LÚC PHÁT — gắn tệp sau `save()` thì realtime rỗng và
 * bong bóng chỉ hiện lại sau khi tải trang.
 *
 * Payload đọc trong listener chứ không đọc lúc assert: đọc lúc assert thì
 * lazy-load cứu luôn cả bản có lỗi, bài test mất tác dụng.
 */

/** @return list<array<string, mixed>> payload message.created theo đúng thứ tự phát. */
function capturedCreatedPayloads(callable $act): array
{
    $payloads = [];

    Event::listen(DomainEvent::class, function (DomainEvent $event) use (&$payloads) {
        if ($event->type === EventType::MESSAGE_CREATED) {
            $payloads[] = MessageResource::pushEventData($event->data['message']);
        }
    });

    $act();

    return $payloads;
}

/** @param list<array<string, mixed>> $payloads */
function expectSingleAttachmentInPayload(array $payloads, string $fileType): void
{
    expect($payloads)->toHaveCount(1)
        ->and($payloads[0]['attachments'] ?? [])->toHaveCount(1)
        ->and($payloads[0]['attachments'][0]['file_type'])->toBe($fileType);
}

beforeEach(function () {
    Storage::fake('public');
});

it('Telegram: message.created mang theo đính kèm', function () {
    Http::fake([
        'api.telegram.org/*getUserProfilePhotos*' => Http::response(['ok' => true, 'result' => ['photos' => []]]),
        'api.telegram.org/*getFile*' => Http::response(['ok' => true, 'result' => ['file_path' => 'photos/file_1.jpg']]),
        'api.telegram.org/file/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
        'api.telegram.org/*' => Http::response(['ok' => true, 'result' => []]),
    ]);

    $inbox = Inbox::factory()->telegram()->create();

    $payloads = capturedCreatedPayloads(fn () => (new IncomingMessageService(
        $inbox,
        ChannelFixture::load('telegram_photo'),
    ))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('LINE: message.created mang theo đính kèm', function () {
    Http::fake([
        'api.line.me/*/profile/*' => Http::response(['userId' => 'U4af4980629', 'displayName' => 'Khách LINE']),
        'api-data.line.me/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
    ]);

    $inbox = Inbox::factory()->line()->create();
    $params = ChannelFixture::load('line_text');
    $params['events'][0]['message'] = ['type' => 'image', 'id' => '14353798921116'];

    $payloads = capturedCreatedPayloads(fn () => (new App\Services\Line\IncomingMessageService($inbox, $params))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('SMS: message.created mang theo đính kèm', function () {
    Http::fake(['*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

    $inbox = Inbox::factory()->sms()->create();
    $params = ChannelFixture::load('sms_incoming')[0]['message'];
    $params['media'] = ['https://messaging.bandwidth.com/media/anh.jpg'];

    $payloads = capturedCreatedPayloads(fn () => (new App\Services\Sms\IncomingMessageService($inbox, $params))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('Twilio: message.created mang theo đính kèm', function () {
    Http::fake(['*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

    $inbox = Inbox::factory()->twilioSms()->create();
    $params = [
        ...ChannelFixture::load('twilio_incoming'),
        'AccountSid' => $inbox->channel->account_sid,
        'To' => $inbox->channel->phone_number,
        'NumMedia' => '1',
        'MediaUrl0' => 'https://api.twilio.com/media/anh.jpg',
    ];

    $payloads = capturedCreatedPayloads(fn () => (new App\Services\Twilio\IncomingMessageService($params))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('TikTok: message.created mang theo đính kèm', function () {
    Http::fake([
        'business-api.tiktok.com/*' => Http::response(['data' => ['download_url' => 'https://cdn.tiktok.test/anh.jpg']]),
        'cdn.tiktok.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
    ]);

    $inbox = Inbox::factory()->tiktok()->create();
    $inbox->channel->update(['business_id' => 'business-open-id']);
    $content = json_decode(ChannelFixture::load('tiktok_receive')['content'], true);
    $content['type'] = 'image';
    $content['image'] = ['media_id' => 'media-1'];

    $payloads = capturedCreatedPayloads(fn () => (new MessageService($inbox->channel, $content))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('WhatsApp: message.created mang theo đính kèm', function () {
    Http::fake([
        'graph.facebook.com/*/media-1*' => Http::response(['url' => 'https://lookaside.test/anh.jpg']),
        'lookaside.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
        'graph.facebook.com/*' => Http::response([]),
    ]);

    $inbox = Inbox::factory()->whatsapp()->create();
    $params = ChannelFixture::load('whatsapp_cloud_text');
    $params['entry'][0]['changes'][0]['value']['messages'][0] = [
        'from' => '15557654321',
        'id' => 'wamid.media',
        'timestamp' => '1662628935',
        'type' => 'image',
        'image' => ['id' => 'media-1', 'caption' => 'Ảnh của tôi'],
    ];

    $payloads = capturedCreatedPayloads(fn () => (new App\Services\Whatsapp\IncomingMessageService($inbox, $params))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('Messenger: message.created phát sau commit nên đã có đính kèm', function () {
    // Lõi dựng đính kèm TRƯỚC khi lưu (InboundMessageWriter) nên payload realtime đã có tệp.
    Http::fake([
        'graph.facebook.com/*' => Http::response(['name' => 'Khách FB']),
        'cdn.fbsbx.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
    ]);

    $inbox = Inbox::factory()->facebookPage()->create();
    $inbox->channel->update(['page_id' => 'page-id']);
    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.media',
        'attachments' => [['type' => 'image', 'payload' => ['url' => 'https://cdn.fbsbx.test/anh.jpg']]],
    ];
    $messaging = $payload['entry'][0]['messaging'][0];

    $payloads = capturedCreatedPayloads(fn () => (new MessageCreator(new MessageParser($messaging)))->perform());

    expectSingleAttachmentInPayload($payloads, 'image');
});

it('tệp tải hỏng vẫn giữ tin bằng đính kèm fallback', function () {
    Http::fake([
        'api.telegram.org/*getUserProfilePhotos*' => Http::response(['ok' => true, 'result' => ['photos' => []]]),
        'api.telegram.org/*getFile*' => Http::response(['ok' => true, 'result' => ['file_path' => 'photos/file_1.jpg']]),
        'api.telegram.org/file/*' => Http::response('', 502),
        'api.telegram.org/*' => Http::response(['ok' => true, 'result' => []]),
    ]);

    $inbox = Inbox::factory()->telegram()->create();

    $payloads = capturedCreatedPayloads(fn () => (new IncomingMessageService(
        $inbox,
        ChannelFixture::load('telegram_photo'),
    ))->perform());

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Ảnh của tôi')
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        // URL tải của Telegram nhúng bot token — không được rò ra trình duyệt.
        ->and($message->attachments->first()->external_url)->toBeNull();

    expectSingleAttachmentInPayload($payloads, 'fallback');
});
