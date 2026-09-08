<?php

use App\Jobs\Webhooks\ZaloEventsJob;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Zalo\BridgeEventService;
use Illuminate\Contracts\Queue\Job as QueueJob;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Channels\ChannelFixture;

// Cuộc đua echo ↔ ghi bí danh (`g1-inbound-evidence.md` §7, tin ma 884): tin
// nhiều phần gửi từ Yona, bridge dội phần sau về TRƯỚC khi driver ghi xong
// `content_attributes.external_source_ids` của phần đó.

/** Chạy sự kiện bridge như worker thật (hàng đợi có lượt sau), không phải lane sync. */
function runZaloEventOnQueue(array $payload, int $attempts, bool $expectRelease): void
{
    $queueJob = Mockery::mock(QueueJob::class);
    $queueJob->shouldReceive('attempts')->andReturn($attempts);
    $queueJob->shouldReceive('release')
        ->times($expectRelease ? 1 : 0)
        ->with(ZaloEventsJob::ECHO_RETRY_DELAY_SECONDS);

    $job = new ZaloEventsJob($payload);
    $job->setJob($queueJob);
    $job->handle(app(BridgeEventService::class));
}

function echoRacePayload(string $fixture, array $overrides = []): array
{
    return [...ChannelFixture::load($fixture), 'connection_id' => test()->channel->connectionId(), ...$overrides];
}

function echoRaceConversation(): Conversation
{
    $conversation = Conversation::factory()->create([
        'account_id' => test()->inbox->account_id,
        'inbox_id' => test()->inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
    $conversation->contact->update(['phone_number' => '+84901234567']);

    return $conversation;
}

function echoRaceOutgoing(Conversation $conversation, array $attributes = []): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
        ...$attributes,
    ]);
}

beforeEach(function () {
    // Chỉ giả CDN ở đây: Http::fake() cộng dồn stub, đặt sẵn stub bridge sẽ nuốt
    // mất stub riêng của từng case bên dưới.
    Http::fake(['cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg'])]);

    $this->inbox = Inbox::factory()->zalo()->create();
    $this->channel = $this->inbox->channel;
});

it('hoãn echo của phần sau thay vì dựng tin ma khi bí danh chưa kịp ghi', function () {
    $conversation = echoRaceConversation();
    // Chiều ra mới ghi xong phần 1; phần 2 (`msg-b`) còn đang trên đường.
    $sent = echoRaceOutgoing($conversation, [
        'source_id' => 'msg-a',
        'content_attributes' => ['external_source_ids' => ['msg-a']],
    ]);

    $echo = echoRacePayload('zalo_inbound_echo', ['source_id' => 'msg-b']);

    runZaloEventOnQueue($echo, attempts: 1, expectRelease: true);

    expect($conversation->messages()->count())->toBe(1);

    // Chiều ra ghi xong bí danh trong lúc job nằm chờ.
    $sent->updateQuietly(['content_attributes' => ['external_source_ids' => ['msg-a', 'msg-b']]]);

    runZaloEventOnQueue($echo, attempts: 2, expectRelease: false);

    expect($conversation->messages()->count())->toBe(1)
        ->and(Message::query()->where('source_id', 'msg-b')->count())->toBe(0);
});

it('vẫn dựng tin echo thật từ điện thoại sau khi hết lượt chờ', function () {
    $echo = echoRacePayload('zalo_inbound_echo');

    runZaloEventOnQueue($echo, attempts: 1, expectRelease: true);
    runZaloEventOnQueue($echo, attempts: 2, expectRelease: true);

    expect(Message::query()->where('source_id', 'msg-zalo-echo-1')->count())->toBe(0);

    runZaloEventOnQueue($echo, attempts: 3, expectRelease: false);

    $message = Message::query()->where('source_id', 'msg-zalo-echo-1')->first();

    expect($message)->not->toBeNull()
        ->and($message->message_type)->toBe(Message::TYPE_OUTGOING)
        ->and($message->content_attributes['external_echo'])->toBeTrue();
});

it('không bắt lô tin lịch sử chờ: backfill dựng tin ngay lượt đầu', function () {
    runZaloEventOnQueue(
        echoRacePayload('zalo_inbound_echo', ['backfill' => true]),
        attempts: 1,
        expectRelease: false,
    );

    expect(Message::query()->where('source_id', 'msg-zalo-echo-1')->count())->toBe(1);
});

it('ghi bí danh ngay sau mỗi phần chứ không đợi hết vòng gửi', function () {
    $conversation = echoRaceConversation();
    $seen = [];

    Http::fake(function (Request $request) use (&$seen) {
        if (! str_ends_with($request->url(), '/personal-messages/send')) {
            return Http::response(['ok' => true]);
        }

        $sending = Message::query()->where('message_type', Message::TYPE_OUTGOING)->latest('id')->first();
        $seen[] = $sending?->content_attributes['external_source_ids'] ?? [];

        return Http::response(['ok' => true, 'source_id' => 'msg-'.(count($seen))]);
    });

    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Ba tệp nhé',
    ]);

    $message->pendingAttachments = array_map(fn (string $name) => new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => "zalo/{$name}",
        'filename' => $name,
        'content_type' => 'image/png',
        'byte_size' => 2048,
    ]), ['a.png', 'b.png', 'c.png']);

    $message->save();

    // Phần thứ N thấy đủ bí danh của N-1 phần trước — echo về giữa chừng vẫn dedupe được.
    expect($seen)->toBe([[], ['msg-1'], ['msg-1', 'msg-2']])
        ->and($message->refresh()->content_attributes['external_source_ids'])->toBe(['msg-1', 'msg-2', 'msg-3']);
});

it('gộp tin ma trùng source_id vào tin gốc sau khi gửi xong', function () {
    $conversation = echoRaceConversation();
    // Echo của phần 2 đã lọt lưới ở lần chạy trước và dựng thành bong bóng riêng.
    $ghost = echoRaceOutgoing($conversation, [
        'content' => 'Chị gửi báo giá nhé',
        'source_id' => 'msg-b',
        'content_attributes' => ['external_echo' => true],
    ]);
    $ghost->setReaction('9876543210', '👍');

    Http::fake([zaloBridgePattern('personal-messages/send') => Http::sequence()
        ->push(['ok' => true, 'source_id' => 'msg-a'])
        ->push(['ok' => true, 'source_id' => 'msg-b'])]);

    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Hai tệp nhé',
    ]);

    $message->pendingAttachments = array_map(fn (string $name) => new Attachment([
        'account_id' => $conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => "zalo/{$name}",
        'filename' => $name,
        'content_type' => 'image/png',
        'byte_size' => 2048,
    ]), ['a.png', 'b.png']);

    $message->save();
    $message->refresh();

    expect(Message::query()->whereKey($ghost->getKey())->exists())->toBeFalse()
        ->and($message->content_attributes['external_source_ids'])->toBe(['msg-a', 'msg-b'])
        ->and(collect($message->reactionList())->pluck('emoji')->all())->toBe(['👍'])
        // Tệp của tin gốc còn nguyên, không bị hook xoá tin ma cuốn theo.
        ->and($message->attachments()->count())->toBe(2);
});

it('thu hồi theo msgId của phần thứ hai vẫn áp lên tin gốc', function () {
    $conversation = echoRaceConversation();
    $sent = echoRaceOutgoing($conversation, [
        'source_id' => 'msg-a',
        'content_attributes' => ['external_source_ids' => ['msg-a', 'msg-b']],
    ]);

    $undo = echoRacePayload('zalo_relay_undo');
    $undo['payload'][0]['data']['content']['globalMsgId'] = 'msg-b';

    (new ZaloEventsJob($undo))->handle(app(BridgeEventService::class));

    expect($sent->refresh()->isDeleted())->toBeTrue();
});
