<?php

use App\Channels\Capability;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/builders/messages/facebook/message_builder_spec.rb +
// spec/jobs/webhooks/facebook_events_job_spec.rb (endpoint /bot của gem facebook-messenger).

beforeEach(function () {
    config()->set('services.facebook.app_secret', 'fb-secret');
    config()->set('services.facebook.verify_token', 'fb-verify');
    config()->set('services.facebook.app_id', 'yona-app');
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

it('đặt tên liên hệ theo tên hiển thị đầy đủ của Facebook, không ghép first/last kiểu Tây', function () {
    Http::fake([
        'graph.facebook.com/*' => Http::response(['name' => 'Nguyễn Phước Lộc', 'first_name' => 'Lộc', 'last_name' => 'Nguyễn']),
    ]);

    facebookPost(ChannelFixture::load('facebook_messaging'))->assertOk();

    expect(Message::query()->latest('id')->first()->conversation->contact->name)->toBe('Nguyễn Phước Lộc');
    Http::assertSent(fn ($request) => in_array('name', explode(',', (string) $request['fields']), true));
});

it('bỏ echo của chính tin hệ thống vừa gửi', function () {
    Http::fake(['graph.facebook.com/*' => Http::response([])]);
    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message']['is_echo'] = true;
    $payload['entry'][0]['messaging'][0]['message']['app_id'] = 'yona-app';
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

it('trả lời trích dẫn bằng reply_to.mid ở cấp gốc body, chỉ lượt gửi đầu mang', function () {
    Http::fake([
        'graph.facebook.com/*/me/messages' => Http::response(['message_id' => 'mid.out']),
        'graph.facebook.com/*' => Http::response(['first_name' => 'Nguyễn', 'last_name' => 'An']),
    ]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $quoted = Message::query()->latest('id')->first();
    $conversation = $quoted->conversation;

    $reply = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ còn ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);
    $reply->pendingAttachments = [new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'fb/mau.png',
        'filename' => 'mau.png',
        'content_type' => 'image/png',
        'byte_size' => 10,
    ])];
    $reply->save();

    $sends = collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn ($request) => str_contains($request->url(), '/me/messages'))
        ->values();

    expect($sends)->toHaveCount(2)
        ->and($sends[0]['reply_to'])->toBe(['mid' => 'mid.facebook.1'])
        ->and($sends[0]['message'])->toBe(['text' => 'Dạ còn ạ'])
        ->and($sends[1]->data())->not->toHaveKey('reply_to');
});

it('tin không trả lời trích dẫn thì không gửi reply_to', function () {
    Http::fake([
        'graph.facebook.com/*/me/messages' => Http::response(['message_id' => 'mid.out']),
        'graph.facebook.com/*' => Http::response(['first_name' => 'Nguyễn', 'last_name' => 'An']),
    ]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $conversation = Message::query()->latest('id')->first()->conversation;

    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/me/messages') && ! isset($request['reply_to']));
});

it('đính kèm kiểu file lấy loại theo nội dung: mp4 thành video, pdf vẫn là tệp', function (string $bytes, int $fileType) {
    Storage::fake('public');
    Http::fake([
        'cdn.messenger.test/*' => Http::response($bytes, 200, ['Content-Type' => 'application/octet-stream']),
        'graph.facebook.com/*' => Http::response(['first_name' => 'Nguyễn', 'last_name' => 'An']),
    ]);
    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.facebook.file',
        'attachments' => [['type' => 'file', 'payload' => ['url' => 'https://cdn.messenger.test/tep']]],
    ];

    facebookPost($payload)->assertOk();

    expect(Message::query()->latest('id')->first()->attachments()->first()->file_type)->toBe($fileType);
})->with([
    'video mp4' => [ChannelFixture::mp4Bytes(), Attachment::FILE_TYPE_VIDEO],
    'tài liệu pdf' => [ChannelFixture::pdfBytes(), Attachment::FILE_TYPE_FILE],
]);

/** @param array<string, mixed> $event */
function facebookReceiptPost(array $event): TestResponse
{
    return facebookPost(['object' => 'page', 'entry' => [['id' => 'page-id', 'time' => 1, 'messaging' => [[
        'sender' => ['id' => 'sender-psid'],
        'recipient' => ['id' => 'page-id'],
        ...$event,
    ]]]]]);
}

function facebookOutgoingSentAt(string $mid, CarbonInterface $sentAt): Message
{
    $conversation = Message::query()->where('message_type', Message::TYPE_INCOMING)->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);
    $outgoing->forceFill(['source_id' => $mid, 'status' => Message::STATUSES['sent'], 'created_at' => $sentAt])->save();

    return $outgoing;
}

it('biên nhận đã giao của Meta nâng tin đi từ đã gửi lên đã giao', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['message_id' => 'mid.out'])]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $outgoing = facebookOutgoingSentAt('mid.out.1', now()->subMinute());

    facebookReceiptPost(['delivery' => ['mids' => ['mid.out.1'], 'watermark' => now()->getTimestampMs()]])->assertOk();

    expect($outgoing->fresh()->status)->toBe(Message::STATUSES['delivered']);
});

it('biên nhận đã xem theo watermark chỉ đánh dấu tin đi gửi trước mốc đó', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['message_id' => 'mid.out'])]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $watermark = now()->subMinutes(5);
    $before = facebookOutgoingSentAt('mid.out.before', $watermark->copy()->subMinute());
    $after = facebookOutgoingSentAt('mid.out.after', $watermark->copy()->addMinute());

    facebookReceiptPost(['read' => ['watermark' => $watermark->getTimestampMs()]])->assertOk();

    expect($before->fresh()->status)->toBe(Message::STATUSES['read'])
        ->and($after->fresh()->status)->toBe(Message::STATUSES['sent']);
});

it('kênh Messenger khai biên nhận đã giao và đã xem để giao diện hiện tick thay cho đồng hồ', function () {
    $capabilities = $this->inbox->channel->capabilities();

    expect($capabilities->has(Capability::EventDelivered))->toBeTrue()
        ->and($capabilities->has(Capability::EventSeen))->toBeTrue();
});

it('sticker Messenger về đúng hình dạng sticker của lõi, Meta lặp đính kèm vẫn chỉ một ảnh', function () {
    Storage::fake('public');
    Http::fake([
        'cdn.messenger.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/webp']),
        'graph.facebook.com/*' => Http::response(['name' => 'Nguyễn An']),
    ]);

    facebookPost(ChannelFixture::load('facebook_sticker'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect(StickerMessage::isSticker($message))->toBeTrue()
        ->and($message->content)->toBeNull()
        ->and($message->content_attributes['sticker'])->toBe(['id' => '369239263222822'])
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE);
});

it('cảm xúc của khách trên Messenger ghi vào tin, gỡ thì xoá', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['message_id' => 'mid.out'])]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $outgoing = facebookOutgoingSentAt('mid.out.react', now()->subMinute());

    facebookReceiptPost(['reaction' => ['mid' => 'mid.out.react', 'action' => 'react', 'emoji' => '❤️', 'reaction' => 'love']])->assertOk();
    expect($outgoing->fresh()->reactionList()[0]['emoji'])->toBe('❤️')
        ->and($outgoing->fresh()->reactionList()[0]['by'])->toBe('sender-psid');

    facebookReceiptPost(['reaction' => ['mid' => 'mid.out.react', 'action' => 'unreact']])->assertOk();
    expect($outgoing->fresh()->reactionList())->toBe([]);
});

it('tin Messenger giữ giờ nền tảng và trích dẫn theo mid', function () {
    Http::fake(['graph.facebook.com/*' => Http::response(['name' => 'Nguyễn An'])]);
    facebookPost(ChannelFixture::load('facebook_messaging'));
    $quoted = Message::query()->latest('id')->first();

    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['timestamp'] = now()->subHours(3)->getTimestampMs();
    $payload['entry'][0]['messaging'][0]['message'] = ['mid' => 'mid.facebook.reply', 'text' => 'hỏi lại', 'reply_to' => ['mid' => 'mid.facebook.1']];
    facebookPost($payload)->assertOk();

    $reply = Message::query()->latest('id')->first();

    expect($reply->content_attributes['in_reply_to'])->toBe($quoted->id)
        ->and($reply->created_at->diffInHours(now()))->toBeGreaterThanOrEqual(2);
});
