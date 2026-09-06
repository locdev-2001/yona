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
use Illuminate\Support\Facades\Queue;

// Gửi tin ra Zalo qua bridge giả. Founder chốt 07/09/2026: KHÔNG còn chặn tin
// chủ động (bỏ khung 7h–22h + trần 3 tin/ngày) — bộ đếm chỉ để thống kê.

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
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['message' => 'not_logged_in'], 503)]);

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

it('gửi MỌI đính kèm của một tin và lưu đủ mọi source_id', function () {
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::sequence()
        ->push(['ok' => true, 'source_ids' => ['msg-a', 'msg-a-caption']])
        ->push(['ok' => true, 'source_id' => 'msg-b'])
        ->push(['ok' => true, 'source_id' => 'msg-c'])]);

    $message = zaloOutgoingWithFiles($this->conversation, [
        ['path' => 'zalo/a.png', 'filename' => 'a.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/b.png', 'filename' => 'b.png', 'content_type' => 'image/png', 'file_type' => Attachment::FILE_TYPE_IMAGE],
        ['path' => 'zalo/c.pdf', 'filename' => 'c.pdf', 'content_type' => 'application/pdf'],
    ], 'Ba tệp nhé');

    $payloads = zaloSendPayloads();

    expect($payloads)->toHaveCount(3)
        // Chú thích chỉ đi cùng tệp đầu — nếu không tin sẽ ra ba lần cùng một câu.
        ->and($payloads[0]['text'])->toBe('Ba tệp nhé')
        ->and($payloads[1])->not->toHaveKey('text')
        ->and($payloads[2])->not->toHaveKey('text')
        ->and(collect($payloads)->pluck('filename')->all())->toBe(['a.png', 'b.png', 'c.pdf']);

    $message->refresh();

    expect($message->content_attributes['external_source_ids'])->toBe(['msg-a', 'msg-a-caption', 'msg-b', 'msg-c'])
        ->and($message->source_id)->toBe('msg-a')
        ->and($message->status)->not->toBe(Message::STATUSES['failed']);
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
        ->and($payload['media_kind'])->toBe('file');
});

it('giữ source_id của tệp đã gửi được và nêu tên tệp hỏng khi lượt sau lỗi', function () {
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::sequence()
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
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(
        ['ok' => false, 'error' => 'bridge secret not configured'], 503
    )]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_SECRET_MISMATCH)
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED)
        ->and(app(ZaloHealthMonitor::class)->errorCount($this->channel->connectionId()))->toBe(0);
});

it('coi 403 sai secret là lỗi cấu hình chứ không phải Zalo từ chối', function () {
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['ok' => false, 'message' => 'Forbidden'], 403)]);

    $message = zaloOutgoing($this->conversation);

    expect($message->refresh()->content_attributes['external_error']['code'])->toBe(SendOnZaloService::ERROR_SECRET_MISMATCH)
        ->and($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED)
        ->and(app(ZaloHealthMonitor::class)->errorCount($this->channel->connectionId()))->toBe(0);
});

it('đếm lỗi zca thật vào ngắt mạch', function () {
    fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['ok' => false, 'message' => 'ZaloApiError: rate limited'], 500)]);

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
        fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['message' => 'not_logged_in'], 503)]);
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
        fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['message' => 'not_logged_in'], 503)]);
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
        fakeZaloSendBridge(['127.0.0.1:3710/personal-messages/send' => Http::response(['message' => 'not_logged_in'], 503)]);
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
