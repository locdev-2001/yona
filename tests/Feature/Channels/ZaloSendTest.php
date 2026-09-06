<?php

use App\Jobs\SendReplyJob;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Zalo\SendOnZaloService;
use App\Services\Zalo\SendRateLimiter;
use App\Services\Zalo\ZaloHealthMonitor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

// Gửi tin ra Zalo qua bridge giả. Trần 3 tin/số/ngày và khung 7h–22h CHỈ áp cho
// tin chủ động — tin trả lời trong cửa sổ hội thoại đi tự do (CLAUDE.md).

function fakeZaloSendBridge(array $overrides = []): void
{
    Http::fake([
        '127.0.0.1:3710/personal-messages/send' => Http::response(['ok' => true, 'source_id' => 'sent-1']),
        '127.0.0.1:3710/*' => Http::response(['ok' => true]),
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

beforeEach(function () {
    // Giữa khung giờ cho phép để mặc định không vướng cửa sổ.
    Carbon::setTestNow(Carbon::parse('2026-09-06 10:00:00', 'Asia/Ho_Chi_Minh'));
    $this->inbox = Inbox::factory()->zalo()->create();
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
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['message' => 'not_logged_in'], 503)]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->status)->toBe(Message::STATUSES['failed'])
        ->and($message->content_attributes['external_error'])->toContain('quét lại mã QR')
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
    expect($message->refresh()->content_attributes['external_error'])->toContain('lỗi liên tục');
});

it('chặn tin chủ động thứ tư trong ngày tới cùng một số', function () {
    fakeZaloSendBridge();

    foreach (range(1, 3) as $index) {
        expect(zaloOutgoing($this->conversation, "Tin {$index}")->refresh()->status)
            ->not->toBe(Message::STATUSES['failed']);
    }

    $blocked = zaloOutgoing($this->conversation, 'Tin 4');

    expect($blocked->refresh()->status)->toBe(Message::STATUSES['failed'])
        ->and($blocked->content_attributes['external_error'])->toContain('trần là 3 tin/ngày');
});

it('chặn tin chủ động ngoài khung 7h–22h', function () {
    fakeZaloSendBridge();
    Carbon::setTestNow(Carbon::parse('2026-09-06 23:30:00', 'Asia/Ho_Chi_Minh'));

    $message = zaloOutgoing($this->conversation);

    Http::assertNothingSent();
    expect($message->refresh()->content_attributes['external_error'])->toContain('7h–22h');
});

it('miễn trần và khung giờ cho tin trả lời trong cửa sổ hội thoại', function () {
    fakeZaloSendBridge();
    Carbon::setTestNow(Carbon::parse('2026-09-06 23:30:00', 'Asia/Ho_Chi_Minh'));

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

it('SendReplyJob chọn đúng driver Zalo', function () {
    fakeZaloSendBridge();

    $message = zaloOutgoing($this->conversation);
    (new SendReplyJob($message))->handle();

    Http::assertSentCount(2);
});
