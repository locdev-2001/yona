<?php

use App\Jobs\SendReplyJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Zalo\SendOnZaloService;
use App\Services\Zalo\SendRateLimiter;
use App\Services\Zalo\ZaloHealthMonitor;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Gửi tin ra Zalo qua bridge giả. Founder chốt 07/09/2026: KHÔNG còn chặn tin
// chủ động (bỏ khung 7h–22h + trần 3 tin/ngày) — bộ đếm chỉ để thống kê.

function fakeZaloSendBridge(array $overrides = []): void
{
    Http::fake([
        zaloBridgePattern('personal-messages/send') => Http::response(['ok' => true, 'source_id' => 'sent-1']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
        ...$overrides,
    ]);
}

function zaloConversation(Zalo $channel, Inbox $inbox): Conversation
{
    $conversation = Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
    $conversation->contact->update(['phone_number' => '+84901234567']);

    return $conversation;
}

function zaloOutgoing(Conversation $conversation, string $content = 'Chào bạn'): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
    ]);
}

/**
 * Tin có tệp phải đi qua pendingAttachments như MessageBuilder — attachments
 * lưu xong TRƯỚC khi Message#sendReply chạy, đúng thứ tự thật.
 *
 * @param  list<array<string, mixed>>  $files
 */
function zaloOutgoingWithFiles(Conversation $conversation, array $files, string $content = ''): Message
{
    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
    ]);

    $message->pendingAttachments = array_map(fn (array $file) => new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => $file['file_type'] ?? Attachment::FILE_TYPE_FILE,
        'path' => $file['path'],
        'filename' => $file['filename'],
        'content_type' => $file['content_type'],
        'byte_size' => 2048,
    ]), $files);

    $message->save();

    return $message;
}

/** @return list<array<string, mixed>> Payload của từng lượt gọi /personal-messages/send. */
function zaloSendPayloads(): array
{
    return collect(Http::recorded())
        ->filter(fn (array $pair) => str_ends_with($pair[0]->url(), '/personal-messages/send'))
        ->map(fn (array $pair) => $pair[0]->data())
        ->values()
        ->all();
}

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-09-06 10:00:00', 'Asia/Ho_Chi_Minh'));
    $this->inbox = Inbox::factory()->zalo()->create();
    // Lý do lỗi phải ra đúng ngôn ngữ của tài khoản (errors.zalo.send.*).
    $this->inbox->account->update(['locale' => 'vi']);
    $this->channel = $this->inbox->channel;
    $this->conversation = zaloConversation($this->channel, $this->inbox);
});

afterEach(fn () => Carbon::setTestNow());

it('gửi tin ra bridge đúng payload và ghi source_id', function () {
    fakeZaloSendBridge();

    $message = zaloOutgoing($this->conversation);

    Http::assertSent(function ($request) {
        return str_ends_with($request->url(), '/personal-messages/send')
            && $request['thread_id'] === '9876543210'
            && $request['text'] === 'Chào bạn'
            && $request['connection_id'] === $this->channel->connectionId()
            && $request->hasHeader('X-Bridge-Send-Secret');
    });

    expect($message->refresh()->source_id)->toBe('sent-1');
});

it('tin có lựa chọn gửi thành chữ kèm danh sách đánh số và ghi mức đã gửi', function () {
    fakeZaloSendBridge();

    $message = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Nhận hàng lúc nào ạ?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Giờ hành chính', 'value' => 'office'], ['title' => 'Buổi tối', 'value' => 'evening']]],
    ]);

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/send')
        && str_starts_with($request['text'], 'Nhận hàng lúc nào ạ?')
        && str_contains($request['text'], '1. Giờ hành chính')
        && str_contains($request['text'], '2. Buổi tối'));

    expect($message->refresh()->content_attributes['delivery'])->toBe('text_numbered');
});

// 6b: ảnh thẻ (satori) — Zalo không có khung thẻ gốc nên gửi ảnh như một đính kèm mang chữ.
it('cards gửi ra Zalo: ảnh thẻ (PNG) đi trước không chú thích, chữ kèm danh sách số thành tin riêng ngay sau', function () {
    Storage::fake('public');
    config(['zalo.bridge.send_secret' => 'test-secret']);
    // render/card PHẢI đứng trước personal-messages/send và '*': Http chọn stub khớp
    // ĐẦU TIÊN theo thứ tự khai, không theo độ cụ thể — xem CardImageDeliveryTest.php.
    Http::fake([
        zaloBridgePattern('render/card') => Http::response('fake-png-bytes', 200, ['Content-Type' => 'image/png']),
        zaloBridgePattern('personal-messages/send') => Http::sequence()
            ->push(['ok' => true, 'source_id' => 'msg-card'])
            ->push(['ok' => true, 'source_id' => 'msg-text']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);

    $message = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Xem sản phẩm này nhé',
        'content_type' => Message::CONTENT_TYPES['cards'],
        'content_attributes' => ['items' => [[
            'title' => 'Bình men lam',
            'price' => 450000,
            'actions' => [['kind' => 'reply', 'label' => 'Đặt mua', 'value' => 'order']],
        ]]],
    ]);

    [$cardPayload, $textPayload] = zaloSendPayloads();

    expect(zaloSendPayloads())->toHaveCount(2)
        ->and($cardPayload)->not->toHaveKey('text')
        ->and($cardPayload['file_url'])->toContain('card-images/')
        ->and($cardPayload['media_kind'])->toBe('image')
        ->and($cardPayload['filename'])->toBe('the.png')
        ->and($cardPayload['content_type'])->toBe('image/png')
        // Khách trả lời bằng số: danh sách số phải nằm trong tin chữ khách đọc được.
        ->and($textPayload['text'])->toContain('Xem sản phẩm này nhé')
        ->and($textPayload['text'])->toContain('1. Đặt mua')
        ->and($textPayload)->not->toHaveKey('file_url')
        ->and($message->refresh()->content_attributes['delivery'])->toBe('image_text')
        ->and($message->content_attributes['external_source_ids'])->toBe(['msg-card', 'msg-text']);
});

it('gửi kèm quote zca khi agent trả lời trích dẫn', function () {
    fakeZaloSendBridge();

    $quoted = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Bên mình có gói nào rẻ hơn không?',
        'source_id' => 'msg-zalo-1',
        'content_attributes' => ['zca_message' => [
            'msgId' => 'msg-zalo-1',
            'cliMsgId' => '1788714913519',
            'msgType' => 'webchat',
            'uidFrom' => '9876543210',
            'content' => 'Bên mình có gói nào rẻ hơn không?',
            'ts' => '1788714913596',
            'ttl' => 0,
        ]],
    ]);

    $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ có ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/send')
        && $request['quote']['msgId'] === 'msg-zalo-1'
        && $request['quote']['cliMsgId'] === '1788714913519');
});

it('không gửi quote khi tin được trả lời chưa có ảnh chụp zca', function () {
    fakeZaloSendBridge();

    $quoted = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Tin cũ trước khi bridge gửi listener_data',
    ]);

    $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ có ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/personal-messages/send')
        && ! isset($request['quote']));
});

it('không gửi lại tin do bridge dội về', function () {
    fakeZaloSendBridge();

    $message = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Tin dội lại',
        'source_id' => 'echo-1',
    ]);

    (new SendOnZaloService($message))->perform();

    Http::assertNothingSent();
});

it('ghi lỗi khi phiên Zalo đã mất', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['message' => 'not_logged_in'], 503)]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->status)->toBe(Message::STATUSES['failed'])
        ->and($message->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_SESSION_LOST)
        ->and($message->content_attributes['external_error']['message'])->toContain('quét lại mã QR')
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_SESSION_LOST);
});

it('không gửi khi kênh chưa kết nối', function () {
    fakeZaloSendBridge();
    $this->channel->update(['state' => Zalo::STATE_SESSION_LOST]);

    $message = zaloOutgoing($this->conversation);

    Http::assertNothingSent();
    expect($message->refresh()->status)->toBe(Message::STATUSES['failed']);
});

it('không gửi khi ngắt mạch đang mở', function () {
    fakeZaloSendBridge();
    $monitor = app(ZaloHealthMonitor::class);
    for ($i = 0; $i < 5; $i++) {
        $monitor->recordError($this->channel->connectionId(), '429');
    }

    $message = zaloOutgoing($this->conversation);

    Http::assertNothingSent();
    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_CIRCUIT_OPEN);
});

// Q6 (founder 07/09/2026): không còn giới hạn tin chủ động — chỉ còn đếm.
it('vẫn gửi tin chủ động thứ tư trong ngày và ngoài khung 7h–22h', function () {
    fakeZaloSendBridge();
    Carbon::setTestNow(Carbon::parse('2026-09-06 23:30:00', 'Asia/Ho_Chi_Minh'));

    foreach (range(1, 4) as $index) {
        expect(zaloOutgoing($this->conversation, "Tin {$index}")->refresh()->status)
            ->not->toBe(Message::STATUSES['failed']);
    }

    expect(zaloSendPayloads())->toHaveCount(4)
        ->and(app(SendRateLimiter::class)->currentCount($this->inbox->account_id, '+84901234567'))->toBe(4);
});

it('không đếm tin trả lời trong cửa sổ hội thoại vào số tin chủ động', function () {
    fakeZaloSendBridge();

    $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->inbox->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Khách hỏi',
    ]);

    foreach (range(1, 4) as $index) {
        $reply = zaloOutgoing($this->conversation, "Trả lời {$index}");
        expect($reply->refresh()->status)->not->toBe(Message::STATUSES['failed']);
    }

    expect(app(SendRateLimiter::class)->currentCount($this->inbox->account_id, '+84901234567'))->toBe(0);
});

// ── Lô 3: mọi đính kèm đều đi, tên tệp thật, lỗi có cấu trúc, thử lại ──

it('nhiều ảnh của một tin đi thành MỘT khối album không chú thích, tệp khác đi riêng, chữ thành tin riêng đi cuối, lưu đủ mọi source_id', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::sequence()
        ->push(['ok' => true, 'source_id' => 'msg-a', 'source_ids' => ['msg-a', 'msg-b']])
        ->push(['ok' => true, 'source_id' => 'msg-c'])
        ->push(['ok' => true, 'source_id' => 'msg-text'])]);

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.png', 'filename' => 'b.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/c.pdf', 'filename' => 'c.pdf', 'content_type' => 'application/pdf'],
    ], 'Ba tệp nhé');

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(3)
        ->and($payloads[0])->not->toHaveKey('text')
        ->and($payloads[0])->not->toHaveKey('file_url')
        ->and($payloads[0]['max_bytes'])->toBe(Zalo::MAX_ATTACHMENT_BYTES)
        ->and(collect($payloads[0]['album'])->pluck('filename')->all())->toBe(['a.png', 'b.png'])
        ->and(collect($payloads[0]['album'])->pluck('content_type')->all())->toBe(['image/png', 'image/png'])
        ->and(collect($payloads[0]['album'])->every(fn (array $item) => filled($item['file_url'])))->toBeTrue()
        ->and($payloads[1])->not->toHaveKey('text')
        ->and($payloads[1]['filename'])->toBe('c.pdf')
        // Yona hiện tệp và chữ thành hai bong bóng: Zalo cũng nhận chữ thành tin riêng, sau tệp.
        ->and($payloads[2]['text'])->toBe('Ba tệp nhé')
        ->and($payloads[2])->not->toHaveKey('file_url')
        ->and($payloads[2])->not->toHaveKey('album');

    $message->refresh();

    expect($message->content_attributes['external_source_ids'])->toBe(['msg-a', 'msg-b', 'msg-c', 'msg-text'])
        ->and($message->source_id)->toBe('msg-a')
        ->and($message->status)->not->toBe(Message::STATUSES['failed']);
});

it('ảnh GIF không vào khối album, đi riêng như ảnh động; một ảnh tĩnh thì gửi như ảnh đơn', function () {
    fakeZaloSendBridge();

    zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.gif', 'filename' => 'b.gif', 'content_type' => 'image/gif', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ], 'Ảnh động nè');

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(3)
        ->and(collect($payloads)->every(fn (array $payload) => ! array_key_exists('album', $payload)))->toBeTrue()
        ->and(collect($payloads)->take(2)->pluck('media_kind')->all())->toBe(['image', 'gif'])
        ->and($payloads[0])->not->toHaveKey('text')
        ->and($payloads[2]['text'])->toBe('Ảnh động nè');
});

it('một ảnh hoặc một video kèm chữ: tệp đi trước không chú thích, chữ thành tin riêng ngay sau, lưu msgId cả hai', function (string $filename, string $contentType, int $fileType, string $mediaKind) {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::sequence()
        ->push(['ok' => true, 'source_id' => 'msg-file'])
        ->push(['ok' => true, 'source_id' => 'msg-text'])]);

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => "zalo/{$filename}", 'filename' => $filename, 'content_type' => $contentType, 'file_type' => $fileType],
    ], 'Test');

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(2)
        ->and($payloads[0]['media_kind'])->toBe($mediaKind)
        ->and($payloads[0])->not->toHaveKey('text')
        ->and($payloads[1])->toMatchArray(['text' => 'Test'])
        ->and($payloads[1])->not->toHaveKey('file_url')
        ->and($message->refresh()->content_attributes['external_source_ids'])->toBe(['msg-file', 'msg-text'])
        ->and($message->source_id)->toBe('msg-file');
})->with([
    'ảnh' => ['a.png', 'image/png', Attachment::FILE_TYPE_IMAGE, 'image'],
    'video' => ['clip.mp4', 'video/mp4', Attachment::FILE_TYPE_VIDEO, 'video'],
]);

it('tin chỉ có tệp không sinh tin chữ rỗng', function () {
    fakeZaloSendBridge();

    zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ]);

    expect(zaloSendPayloads())->toHaveCount(1);
});

it('khối album hỏng giữa chừng vẫn giữ msgId các ảnh đã tới khách', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(
        ['ok' => false, 'message' => 'Zalo từ chối', 'source_ids' => ['msg-a']], 500
    )]);

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.png', 'filename' => 'b.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ]);

    $message->refresh();

    expect($message->status)->toBe(Message::STATUSES['failed'])
        ->and($message->source_id)->toBe('msg-a')
        ->and($message->content_attributes['external_source_ids'])->toBe(['msg-a'])
        ->and($message->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_ZALO_REJECTED);
});

it('tin có tệp đã lưu được đẩy ngay vào hàng đợi media riêng, không đứng chờ trễ cố định', function () {
    Queue::fake();

    zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/anh.jpg', 'filename' => 'anh.jpg', 'content_type' => 'image/jpeg', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ]);

    Queue::assertPushedOn(SendReplyJob::MEDIA_QUEUE, SendReplyJob::class, fn (SendReplyJob $job) => $job->delay === null);
});

it('tin chữ đi hàng đợi high, không xếp sau tệp đang gửi ở hàng media', function () {
    Queue::fake();

    zaloOutgoing($this->conversation);

    Queue::assertPushed(SendReplyJob::class, fn (SendReplyJob $job) => $job->queue === SendReplyJob::TEXT_QUEUE);
    Queue::assertNotPushed(SendReplyJob::class, fn (SendReplyJob $job) => $job->queue === SendReplyJob::MEDIA_QUEUE);
});

it('ghi một dòng log thời gian từng chặng và gửi kèm message_id để bridge nối log', function () {
    fakeZaloSendBridge();
    Log::spy();

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.jpg', 'filename' => 'b.jpg', 'content_type' => 'image/jpeg', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ]);

    expect(collect(zaloSendPayloads())->pluck('message_id')->all())->toBe([$message->id]);

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $event, array $context) => $event === 'zalo.send.timing'
        && $context['message_id'] === $message->id
        && $context['queue_wait_ms'] === 0
        && $context['failure'] === null
        && is_int($context['total_ms'])
        && collect($context['parts'])->pluck('media_kind')->all() === ['album']
        && collect($context['parts'])->pluck('bytes')->all() === [4096]
        && collect($context['parts'])->every(fn (array $part) => is_int($part['bridge_ms']) && $part['bridge_ms'] >= 0));
});

it('log thời gian vẫn ghi khi lượt gửi hỏng, kèm mã lỗi', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['ok' => false, 'message' => 'not_logged_in'], 503)]);
    Log::spy();

    $message = zaloOutgoing($this->conversation);

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $event, array $context) => $event === 'zalo.send.timing'
        && $context['message_id'] === $message->id
        && $context['failure'] === SendOnZaloService::ERROR_SESSION_LOST
        && collect($context['parts'])->pluck('media_kind')->all() === ['text']
        && $context['parts'][0]['bytes'] === null);
});

it('gửi tên tệp gốc và content-type thật của tệp .docx tới bridge', function () {
    fakeZaloSendBridge();

    zaloOutgoingWithFiles($this->conversation, [[
        'path' => 'zalo/bao-gia.docx',
        'filename' => 'Báo giá tháng 9.docx',
        'content_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]]);

    $payload = zaloSendPayloads()[0];

    expect($payload['filename'])->toBe('Báo giá tháng 9.docx')
        ->and($payload['content_type'])->toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        ->and($payload['media_kind'])->toBe('file')
        ->and($payload['max_bytes'])->toBe(Zalo::MAX_ATTACHMENT_BYTES);
});

it('giữ source_id của tệp đã gửi được và nêu tên tệp hỏng khi lượt sau lỗi', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::sequence()
        ->push(['ok' => true, 'source_id' => 'msg-a'])
        ->push(['ok' => false, 'message' => 'download_failed_404'], 500)]);

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.png', 'filename' => 'hop-dong.pdf', 'content_type' => 'application/pdf'],
    ]);

    $message->refresh();

    expect($message->status)->toBe(Message::STATUSES['failed'])
        ->and($message->content_attributes['external_source_ids'])->toBe(['msg-a'])
        ->and($message->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_MEDIA_FETCH_FAILED)
        ->and($message->content_attributes['external_error']['message'])->toContain('hop-dong.pdf');
});

it('coi 503 thiếu secret là lỗi cấu hình: không đổi trạng thái kênh, không mở ngắt mạch', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(
        ['ok' => false, 'error' => 'bridge secret not configured'], 503
    )]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_SECRET_MISMATCH)
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED)
        ->and(app(ZaloHealthMonitor::class)->errorCount($this->channel->connectionId()))->toBe(0);
});

it('coi 403 sai secret là lỗi cấu hình chứ không phải Zalo từ chối', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['ok' => false, 'message' => 'Forbidden'], 403)]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_SECRET_MISMATCH)
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED)
        ->and(app(ZaloHealthMonitor::class)->errorCount($this->channel->connectionId()))->toBe(0);
});

it('đếm lỗi zca thật vào ngắt mạch', function () {
    fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['ok' => false, 'message' => 'ZaloApiError: rate limited'], 500)]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_ZALO_REJECTED)
        ->and(app(ZaloHealthMonitor::class)->errorCount($this->channel->connectionId()))->toBe(1);
});

it('báo bridge không gọi được mà không đụng trạng thái phiên', function () {
    Http::fake(fn () => throw new ConnectionException('connection refused'));

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_BRIDGE_UNREACHABLE)
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED);
});

it('SendReplyJob chọn đúng driver Zalo', function () {
    fakeZaloSendBridge();

    $message = zaloOutgoing($this->conversation);
    (new SendReplyJob($message))->handle();

    Http::assertSentCount(2);
});

describe('POST …/messages/{message}/retry', function () {
    function zaloRetryAgent(Inbox $inbox): User
    {
        $agent = User::factory()->create();
        AccountUser::factory()->create([
            'account_id' => $inbox->account_id,
            'user_id' => $agent->id,
            'role' => AccountUser::ROLE_AGENT,
        ]);
        $inbox->addMembers([$agent->id]);

        return $agent;
    }

    it('đổi tin thất bại về sent, xoá lý do lỗi và đẩy lại SendReplyJob', function () {
        fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['message' => 'not_logged_in'], 503)]);
        $message = zaloOutgoing($this->conversation);
        expect($message->refresh()->status)->toBe(Message::STATUSES['failed']);

        Queue::fake();
        $agent = zaloRetryAgent($this->inbox);
        $account = Account::find($this->inbox->account_id);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/retry")
            ->assertOk()
            ->assertJsonPath('id', $message->id);

        Queue::assertPushed(SendReplyJob::class);

        $message->refresh();

        expect($message->status)->toBe(Message::STATUSES['sent'])
            ->and($message->content_attributes)->not->toHaveKey('external_error')
            ->and($message->source_id)->toBeNull();
    });

    it('giữ nguyên trích dẫn và bí danh source_id khi gửi lại', function () {
        fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['message' => 'not_logged_in'], 503)]);
        $message = zaloOutgoing($this->conversation);
        $quoted = $this->conversation->messages()->create([
            'account_id' => $this->conversation->account_id,
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => Message::TYPE_INCOMING,
            'content' => 'Khách hỏi',
        ]);
        $message->update(['content_attributes' => [
            ...$message->refresh()->content_attributes,
            'in_reply_to' => $quoted->id,
            'external_source_ids' => ['msg-a'],
        ]]);

        Queue::fake();
        $agent = zaloRetryAgent($this->inbox);
        $account = Account::find($this->inbox->account_id);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/retry")
            ->assertOk();

        expect($message->refresh()->content_attributes)->toMatchArray([
            'in_reply_to' => $quoted->id,
            'external_source_ids' => ['msg-a'],
        ]);
    });

    it('không gửi lại tin chưa thất bại', function () {
        fakeZaloSendBridge();
        $message = zaloOutgoing($this->conversation);

        Queue::fake();
        $agent = zaloRetryAgent($this->inbox);
        $account = Account::find($this->inbox->account_id);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/retry")
            ->assertOk();

        Queue::assertNotPushed(SendReplyJob::class);
        expect($message->refresh()->source_id)->toBe('sent-1');
    });

    it('từ chối người không thấy được hội thoại', function () {
        fakeZaloSendBridge([zaloBridgePattern('personal-messages/send') => Http::response(['message' => 'not_logged_in'], 503)]);
        $message = zaloOutgoing($this->conversation);

        $outsider = User::factory()->create();
        AccountUser::factory()->create([
            'account_id' => $this->inbox->account_id,
            'user_id' => $outsider->id,
            'role' => AccountUser::ROLE_AGENT,
        ]);
        $account = Account::find($this->inbox->account_id);

        $this->actingAs($outsider)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/retry")
            ->assertUnauthorized();
    });
});

// ── Trả lời trích dẫn: part nào mang quote, loại quote zca không nhận ──

/** @param array<string, mixed> $snapshotOverrides */
function zaloReplyTargetWithSnapshot(Conversation $conversation, array $snapshotOverrides = [], int $messageType = Message::TYPE_INCOMING): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => $messageType,
        'content' => 'Còn hàng không shop?',
        'source_id' => 'msg-zalo-quoted',
        'content_attributes' => ['zca_message' => [
            'msgId' => 'msg-zalo-quoted',
            'cliMsgId' => '1788714913519',
            'msgType' => 'webchat',
            'uidFrom' => '9876543210',
            'content' => 'Còn hàng không shop?',
            'ts' => '1788714913596',
            'ttl' => 0,
            ...$snapshotOverrides,
        ]],
    ]);
}

it('trả lời trích dẫn kèm nhiều ảnh: khối ảnh đi trước, trích dẫn gắn vào tin chữ đi sau', function () {
    fakeZaloSendBridge();
    $quoted = zaloReplyTargetWithSnapshot($this->conversation);

    $message = new Message([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Mẫu đây ạ',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);
    $message->pendingAttachments = [
        new Attachment(['account_id' => $this->conversation->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'byte_size' => 10]),
        new Attachment(['account_id' => $this->conversation->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'path' => 'zalo/b.png', 'filename' => 'b.png', 'content_type' => 'image/png', 'byte_size' => 10]),
    ];
    $message->save();

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(2)
        ->and($payloads[0]['album'])->toHaveCount(2)
        ->and($payloads[0])->not->toHaveKey('quote')
        ->and($payloads[0])->not->toHaveKey('text')
        ->and($payloads[1]['text'])->toBe('Mẫu đây ạ')
        ->and($payloads[1]['quote']['msgId'])->toBe('msg-zalo-quoted');
});

it('gửi không trích dẫn khi tin gốc là bình chọn nhóm', function () {
    fakeZaloSendBridge();
    $quoted = zaloReplyTargetWithSnapshot($this->conversation, ['msgType' => 'group.poll']);

    $reply = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ em chọn phương án 2',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    expect(zaloSendPayloads())->toHaveCount(1)
        ->and(zaloSendPayloads()[0])->not->toHaveKey('quote')
        ->and($reply->refresh()->status)->not->toBe(Message::STATUSES['failed']);
});

it('gửi không trích dẫn khi tin gốc webchat có nội dung không phải chuỗi', function () {
    fakeZaloSendBridge();
    $quoted = zaloReplyTargetWithSnapshot($this->conversation, ['content' => ['title' => 'Liên kết', 'href' => 'https://yona.vn']]);

    $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ vâng',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    expect(zaloSendPayloads()[0])->not->toHaveKey('quote');
});

it('trích dẫn được chính tin shop đã gửi sau khi echo bổ sung ảnh chụp zca', function () {
    fakeZaloSendBridge();
    $quoted = zaloReplyTargetWithSnapshot($this->conversation, ['cliMsgId' => '1788714999999'], Message::TYPE_OUTGOING);

    $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Em nhắc lại giá nhé',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]);

    $replyPayload = collect(zaloSendPayloads())->last();

    expect($replyPayload['quote']['cliMsgId'])->toBe('1788714999999');
});

// ── Nhắc tên thành viên nhóm: lõi đã neo offset UTF-16, driver đổi sang uid/pos/len ──

function zaloGroupConversation(Inbox $inbox): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => ['thread_id' => 'g1', 'thread_type' => Zalo::THREAD_TYPE_GROUP],
    ]);
}

/** @param array<string, mixed> $contentAttributes */
function zaloMentionReply(Conversation $conversation, string $content, array $contentAttributes): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
        'content_attributes' => $contentAttributes,
    ]);
}

it('gửi nhắc tên trong nhóm thành uid/pos/len và giữ nguyên chữ', function () {
    fakeZaloSendBridge();

    zaloMentionReply(zaloGroupConversation($this->inbox), '@Bình kiểm tra giúp đơn 123', [
        'mentions' => [['external_id' => '555', 'name' => 'Bình']],
    ]);

    $payload = zaloSendPayloads()[0];

    expect($payload['thread_type'])->toBe(1)
        ->and($payload['text'])->toBe('@Bình kiểm tra giúp đơn 123')
        ->and($payload['mentions'])->toBe([['uid' => '555', 'pos' => 0, 'len' => 5]]);
});

it('chat 1-1 không gửi nhắc tên dù client API có gửi mentions', function () {
    fakeZaloSendBridge();

    zaloMentionReply($this->conversation, '@Bình ơi', ['mentions' => [['external_id' => '555', 'name' => 'Bình']]]);

    expect(zaloSendPayloads()[0])->not->toHaveKey('mentions');
});

it('tin có hai tệp: tệp đi trước không chữ, nhắc tên gắn vào tin chữ đi cuối', function () {
    fakeZaloSendBridge();
    $conversation = zaloGroupConversation($this->inbox);

    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => '@Bình ảnh đơn đây',
        'content_attributes' => ['mentions' => [['external_id' => '555', 'name' => 'Bình', 'offset' => 0]]],
    ]);
    $message->pendingAttachments = [
        new Attachment(['account_id' => $conversation->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'byte_size' => 10]),
        new Attachment(['account_id' => $conversation->account_id, 'file_type' => Attachment::FILE_TYPE_FILE, 'path' => 'zalo/b.pdf', 'filename' => 'b.pdf', 'content_type' => 'application/pdf', 'byte_size' => 10]),
    ];
    $message->save();

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(3)
        ->and(collect($payloads)->take(2)->pluck('filename')->all())->toBe(['a.png', 'b.pdf'])
        ->and($payloads[0])->not->toHaveKey('text')
        ->and($payloads[0])->not->toHaveKey('mentions')
        ->and($payloads[2]['text'])->toBe('@Bình ảnh đơn đây')
        ->and($payloads[2]['mentions'])->toBe([['uid' => '555', 'pos' => 0, 'len' => 5]]);
});

it('nhóm: khối album nhiều ảnh đi trước, tin chữ mang nhắc tên đi sau', function () {
    fakeZaloSendBridge();
    $conversation = zaloGroupConversation($this->inbox);

    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => '@Bình mẫu mới',
        'content_attributes' => ['mentions' => [['external_id' => '555', 'name' => 'Bình', 'offset' => 0]]],
    ]);
    $message->pendingAttachments = [
        new Attachment(['account_id' => $conversation->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'byte_size' => 10]),
        new Attachment(['account_id' => $conversation->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'path' => 'zalo/b.jpg', 'filename' => 'b.jpg', 'content_type' => 'image/jpeg', 'byte_size' => 10]),
    ];
    $message->save();

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(2)
        ->and($payloads[0]['album'])->toHaveCount(2)
        ->and($payloads[0])->not->toHaveKey('mentions')
        ->and($payloads[1]['text'])->toBe('@Bình mẫu mới')
        ->and($payloads[1]['mentions'])->toBe([['uid' => '555', 'pos' => 0, 'len' => 5]]);
});

it('trả lời trích dẫn kèm nhắc tên: phần chữ mang cả quote lẫn mentions', function () {
    fakeZaloSendBridge();
    $conversation = zaloGroupConversation($this->inbox);
    $quoted = zaloReplyTargetWithSnapshot($conversation);

    zaloMentionReply($conversation, 'Nhờ @An xem giúp', [
        'in_reply_to' => $quoted->id,
        'mentions' => [['external_id' => '777', 'name' => 'An', 'offset' => 4]],
    ]);

    $payload = collect(zaloSendPayloads())->last();

    expect($payload['quote']['msgId'])->toBe('msg-zalo-quoted')
        ->and($payload['mentions'])->toBe([['uid' => '777', 'pos' => 4, 'len' => 3]]);
});

it('gửi lại tin lỗi vẫn mang nhắc tên', function () {
    fakeZaloSendBridge();
    $this->channel->markState(Zalo::STATE_SESSION_LOST, 'not_logged_in');
    $conversation = zaloGroupConversation($this->inbox);
    $message = zaloMentionReply($conversation, '@Bình xem giúp', ['mentions' => [['external_id' => '555', 'name' => 'Bình']]]);
    expect($message->refresh()->status)->toBe(Message::STATUSES['failed'])
        ->and(zaloSendPayloads())->toBe([]);

    $agent = zaloRetryAgent($this->inbox);
    $account = Account::find($this->inbox->account_id);
    $this->channel->markState(Zalo::STATE_CONNECTED);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages/{$message->id}/retry")
        ->assertOk();

    expect(collect(zaloSendPayloads())->last()['mentions'])->toBe([['uid' => '555', 'pos' => 0, 'len' => 5]]);
});

/** @param array<string, mixed> $forwardedFrom */
function zaloForwardedOutgoing(Conversation $conversation, array $forwardedFrom, string $content = 'Còn hàng không shop?'): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
        'content_attributes' => ['forwarded_from' => $forwardedFrom],
    ]);
}

function zaloForwardSource(Conversation $conversation): Message
{
    $otherCustomer = Conversation::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'additional_attributes' => ['thread_id' => '1111111111', 'thread_type' => 0],
    ]);

    return zaloReplyTargetWithSnapshot($otherCustomer);
}

it('chuyển tiếp tin chữ trong cùng phiên Zalo: dùng lệnh chuyển tiếp gốc, không quote/tệp, ghi source_id', function () {
    fakeZaloSendBridge();
    $source = zaloForwardSource($this->conversation);

    $message = zaloForwardedOutgoing($this->conversation, ['origin' => 'internal', 'message_id' => $source->id, 'conversation_id' => 1]);

    $payload = zaloSendPayloads()[0];

    expect($payload['text'])->toBe('Còn hàng không shop?')
        ->and($payload['thread_id'])->toBe('9876543210')
        ->and($payload['forward'])->toBe(['msg_id' => 'msg-zalo-quoted', 'ts' => 1788714913596])
        ->and($payload)->not->toHaveKey('quote')
        ->and($payload)->not->toHaveKey('file_url')
        ->and($message->refresh()->source_id)->toBe('sent-1');
});

it('không dùng chuyển tiếp gốc khi thiếu điều kiện', function (Closure $forwardedFrom) {
    fakeZaloSendBridge();

    zaloForwardedOutgoing($this->conversation, $forwardedFrom($this->conversation, $this->inbox));

    $payload = collect(zaloSendPayloads())->last();

    expect($payload)->not->toHaveKey('forward')
        ->and($payload['text'])->toBe('Còn hàng không shop?');
})->with([
    'tin gốc ở hộp thư Zalo khác' => [function (Conversation $conversation) {
        $otherInbox = Inbox::factory()->zalo()->create(['account_id' => $conversation->account_id]);
        $otherConversation = Conversation::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $otherInbox->id,
            'additional_attributes' => ['thread_id' => '2222222222', 'thread_type' => 0],
        ]);

        return ['origin' => 'internal', 'message_id' => zaloReplyTargetWithSnapshot($otherConversation)->id, 'conversation_id' => 1];
    }],
    'tin gốc chưa có ảnh chụp zca' => [fn (Conversation $conversation) => [
        'origin' => 'internal',
        'message_id' => zaloOutgoing($conversation, 'Tin cũ')->id,
        'conversation_id' => 1,
    ]],
    'khách chuyển tiếp trên nền tảng' => [fn () => ['origin' => 'channel', 'sender_name' => 'Nguyễn A']],
    'tin gốc thuộc account khác' => [function () {
        $foreignInbox = Inbox::factory()->zalo()->create();
        $foreign = Conversation::factory()->create([
            'account_id' => $foreignInbox->account_id,
            'inbox_id' => $foreignInbox->id,
            'additional_attributes' => ['thread_id' => '3333333333', 'thread_type' => 0],
        ]);

        return ['origin' => 'internal', 'message_id' => zaloReplyTargetWithSnapshot($foreign)->id, 'conversation_id' => 1];
    }],
]);

it('bản chuyển tiếp có ảnh gửi lại tệp như cũ, không dùng chuyển tiếp gốc', function () {
    fakeZaloSendBridge();
    $source = zaloForwardSource($this->conversation);

    $message = new Message([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Mẫu này nè',
        'content_attributes' => ['forwarded_from' => ['origin' => 'internal', 'message_id' => $source->id, 'conversation_id' => 1]],
    ]);
    $message->pendingAttachments = [new Attachment([
        'account_id' => $this->conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => 'zalo/mau.png',
        'filename' => 'mau.png',
        'content_type' => 'image/png',
        'byte_size' => 10,
    ])];
    $message->save();

    [$imagePayload, $textPayload] = zaloSendPayloads();

    expect($imagePayload)->not->toHaveKey('forward')
        ->and($imagePayload['media_kind'])->toBe('image')
        ->and($textPayload)->not->toHaveKey('forward')
        ->and($textPayload['text'])->toBe('Mẫu này nè');
});

// Bộ soạn lưu markdown; Zalo chỉ hiện chữ trơn nên khách không được thấy `<…>` hay `[chữ](url)`.
it('gửi link cho Zalo dưới dạng chữ trơn, nội dung lưu vẫn là markdown', function () {
    fakeZaloSendBridge();
    $markdown = "Bảng giá <https://yona.vn/bang-gia>\nđặt ở [đây](https://yona.vn/dat-hang?sp=ao_thun)";

    $message = zaloOutgoing($this->conversation, $markdown);

    $text = zaloSendPayloads()[0]['text'];

    expect($text)->toBe("Bảng giá https://yona.vn/bang-gia\nđặt ở đây https://yona.vn/dat-hang?sp=ao_thun")
        ->and($text)->not->toContain('<')->not->toContain('>')->not->toContain('](')
        ->and($message->refresh()->content)->toBe($markdown);
});

it('chữ đi kèm tệp gửi Zalo cũng là chữ trơn', function () {
    fakeZaloSendBridge();

    zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
    ], '**Mẫu mới** xem <https://yona.vn/mau>');

    expect(zaloSendPayloads()[1]['text'])->toBe('Mẫu mới xem https://yona.vn/mau');
});

it('nhắc tên sau link: vị trí tính trên chữ thật gửi đi', function () {
    fakeZaloSendBridge();

    zaloMentionReply(zaloGroupConversation($this->inbox), '<https://yona.vn/gia> **@Bình** xem giúp', [
        'mentions' => [['external_id' => '555', 'name' => 'Bình']],
    ]);

    $payload = zaloSendPayloads()[0];

    expect($payload['text'])->toBe('https://yona.vn/gia @Bình xem giúp')
        ->and($payload['mentions'])->toBe([['uid' => '555', 'pos' => 20, 'len' => 5]]);
});
