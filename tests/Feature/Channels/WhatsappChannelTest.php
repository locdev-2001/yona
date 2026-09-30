<?php

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Whatsapp\Providers\Whatsapp360DialogService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
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

// WhatsApp chưa có renderer gốc (docs/system-architecture.md §3) nên tin có lựa
// chọn phải qua DeliveryPlanner trước khi gửi, hạ xuống chữ kèm danh sách đánh số
// thay vì gửi thẳng câu hỏi trơn như trước.
it('tin có lựa chọn hạ xuống chữ kèm danh sách đánh số trước khi gửi qua Cloud API', function () {
    app()->setLocale('vi');
    Http::fake([
        'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.OUT']]]),
    ]);
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/v13.0/123456/messages')
        && $request['text'] === ['body' => "Bạn có đồng ý không?\n\nNhắn số tương ứng để chọn:\n1. Có\n2. Không"]);

    expect($outgoing->fresh()->source_id)->toBe('wamid.OUT');
});

it('tin chữ thuần vẫn gửi nguyên văn qua nhà cung cấp 360dialog, không đụng logic cũ', function () {
    $this->channel->update(['provider' => 'default', 'provider_config' => ['api_key' => '360-key']]);
    Http::fake(['waba.360dialog.io/*' => Http::response(['messages' => [['id' => 'wamid.360']]])]);
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'waba.360dialog.io/v1/messages')
        && $request['text'] === ['body' => 'Chào bạn']);

    expect($outgoing->fresh()->source_id)->toBe('wamid.360');
});

it('tin có lựa chọn cũng hạ xuống chữ đánh số trên nhà cung cấp 360dialog', function () {
    app()->setLocale('vi');
    $this->channel->update(['provider' => 'default', 'provider_config' => ['api_key' => '360-key']]);
    Http::fake(['waba.360dialog.io/*' => Http::response(['messages' => [['id' => 'wamid.360-qr']]])]);
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn có đồng ý không?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Có', 'value' => 'yes']]],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'waba.360dialog.io/v1/messages')
        && $request['text'] === ['body' => "Bạn có đồng ý không?\n\nNhắn số tương ứng để chọn:\n1. Có"]);

    expect($outgoing->fresh())->not->toBeNull();
});

it('đổi nhà cung cấp là đổi driver, không đụng lõi kênh', function () {
    $this->channel->update(['provider' => 'default', 'provider_config' => ['api_key' => '360-key']]);

    expect($this->channel->fresh()->providerService())
        ->toBeInstanceOf(Whatsapp360DialogService::class);
});

it('trả lời trích dẫn qua Cloud API bằng context.message_id', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.OUT']]]),
    ]);
    whatsappPost(ChannelFixture::load('whatsapp_cloud_text'));
    $quoted = Message::query()->latest('id')->first();
    $conversation = $quoted->conversation;

    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ còn ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/messages')
        && $request['context'] === ['message_id' => $quoted->source_id]
        && $request['text'] === ['body' => 'Dạ còn ạ']);
});

it('chỉ nhà cung cấp Cloud khai năng lực trả lời trích dẫn', function () {
    expect($this->channel->fresh()->capabilities()->has(Capability::OutboundReplyTo))->toBeTrue();

    $this->channel->update(['provider' => 'default', 'provider_config' => ['api_key' => '360-key']]);

    expect($this->channel->fresh()->capabilities()->has(Capability::OutboundReplyTo))->toBeFalse();
});

it('tệp document lấy loại theo nội dung: mp4 thành video, pdf vẫn là tệp', function (string $bytes, string $filename, int $fileType) {
    Storage::fake('public');
    Http::fake([
        'graph.facebook.com/*' => Http::response(['url' => 'https://lookaside.whatsapp.test/media/tep']),
        'lookaside.whatsapp.test/*' => Http::response($bytes, 200, ['Content-Type' => 'application/octet-stream']),
    ]);
    $payload = ChannelFixture::load('whatsapp_cloud_text');
    $payload['entry'][0]['changes'][0]['value']['messages'][0] = [
        'from' => '15557654321',
        'id' => 'wamid.DOC',
        'timestamp' => '1662628935',
        'type' => 'document',
        'document' => ['id' => 'media-doc-1', 'filename' => $filename],
    ];

    whatsappPost($payload)->assertOk();

    expect(Message::query()->latest('id')->first()->attachments()->first()->file_type)->toBe($fileType);
})->with([
    'video mp4' => [ChannelFixture::mp4Bytes(), 'video.mp4', Attachment::FILE_TYPE_VIDEO],
    'tài liệu pdf' => [ChannelFixture::pdfBytes(), 'bang-gia.pdf', Attachment::FILE_TYPE_FILE],
]);

it('sticker vào contract lõi: content_type sticker kèm payload sticker', function () {
    Storage::fake('public');
    Http::fake([
        'graph.facebook.com/*' => Http::response(['url' => 'https://lookaside.whatsapp.test/media/stk']),
        'lookaside.whatsapp.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
    ]);
    $payload = ChannelFixture::load('whatsapp_cloud_text');
    $payload['entry'][0]['changes'][0]['value']['messages'][0] = [
        'from' => '15557654321',
        'id' => 'wamid.STK',
        'timestamp' => '1662628935',
        'type' => 'sticker',
        'sticker' => ['id' => 'media-stk-1', 'mime_type' => 'image/webp', 'animated' => false],
    ];

    whatsappPost($payload)->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
        ->and($message->content_attributes['sticker']['id'])->toBe('media-stk-1');
});
