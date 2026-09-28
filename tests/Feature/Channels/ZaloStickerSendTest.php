<?php

use App\Jobs\SendReplyJob;
use App\Jobs\Webhooks\ZaloEventsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Zalo\BridgeEventService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Channels\ChannelFixture;

// Agent gửi sticker: client chỉ đưa `sticker_id`, máy chủ tự dựng tin từ danh mục
// của kênh rồi driver Zalo gửi qua bridge (giả bằng Http::fake).

const SENT_STICKER_URL = 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130';

/** @return array<string, mixed> */
function catalogSticker98930(): array
{
    return ['id' => 98930, 'cate_id' => 61900, 'type' => 7, 'url' => SENT_STICKER_URL, 'label' => null];
}

/** @param list<array<string, mixed>> $detail Mục bridge trả cho stickers/detail. */
function fakeStickerSendBridge(?array $detail = null, mixed $send = null): void
{
    Http::fake([
        'cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
        zaloBridgePattern('personal-messages/stickers/search') => Http::response(['ok' => true, 'stickers' => [catalogSticker98930()]]),
        zaloBridgePattern('personal-messages/stickers/detail') => Http::response(['ok' => true, 'stickers' => $detail ?? [catalogSticker98930()]]),
        zaloBridgePattern('personal-messages/send') => $send ?? Http::response(['ok' => true, 'source_id' => 'sent-sticker-1']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
}

/** @return list<ClientRequest> */
function stickerSendRequests(string $suffix): array
{
    return collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (ClientRequest $request) => str_ends_with($request->url(), $suffix))
        ->values()
        ->all();
}

/** @param array<string, mixed> $payload */
function postStickerMessage(User $agent, Conversation $conversation, array $payload): TestResponse
{
    $account = Account::find($conversation->account_id);

    return test()->actingAs($agent)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
        $payload,
    );
}

function stickerAgentOf(Inbox $inbox): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $inbox->account_id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return $agent;
}

beforeEach(function () {
    $this->inbox = Inbox::factory()->zalo()->create();
    $this->inbox->account->update(['locale' => 'vi']);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->inbox->account_id,
        'inbox_id' => $this->inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
    $this->agent = stickerAgentOf($this->inbox);
});

it('dựng tin sticker từ danh mục đã có trong cache rồi gửi đúng bộ ba ra bridge', function () {
    fakeStickerSendBridge();
    app(StickerLibrary::class)->browse($this->inbox, 'chào', null);

    $response = postStickerMessage($this->agent, $this->conversation, [
        'content_type' => 'sticker',
        'sticker_id' => '98930',
        'private' => false,
        'echo_id' => 'echo-1',
    ])->assertOk();

    $message = Message::findOrFail($response->json('id'));
    $attachment = $message->attachments()->sole();
    $sends = stickerSendRequests('/personal-messages/send');

    expect($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
        ->and($message->content)->toBeNull()
        ->and($message->content_attributes['sticker'])->toBe([
            'id' => 98930,
            'cateId' => 61900,
            'type' => 7,
            'url' => SENT_STICKER_URL,
            'thumbnail' => SENT_STICKER_URL,
        ])
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->external_url)->toBe(SENT_STICKER_URL)
        ->and($response->json('content_type'))->toBe('sticker')
        ->and($response->json('attachments.0.data_url'))->toBe(SENT_STICKER_URL)
        ->and($sends)->toHaveCount(1)
        ->and($sends[0]['sticker']['id'])->toBe(98930)
        ->and($sends[0]['sticker']['cateId'])->toBe(61900)
        ->and($sends[0]->data())->not->toHaveKey('text')
        ->and($sends[0]->data())->not->toHaveKey('file_url')
        ->and($sends[0]->data())->not->toHaveKey('custom_sticker')
        ->and($message->refresh()->source_id)->toBe('sent-sticker-1')
        ->and(stickerSendRequests('/personal-messages/stickers/detail'))->toBeEmpty();
});

it('cache trống thì tra chi tiết đúng một mã rồi mới gửi', function () {
    fakeStickerSendBridge();

    postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', 'sticker_id' => 98930])->assertOk();

    $details = stickerSendRequests('/personal-messages/stickers/detail');

    expect($details)->toHaveCount(1)
        ->and($details[0]['ids'])->toBe([98930])
        ->and(stickerSendRequests('/personal-messages/send'))->toHaveCount(1);
});

it('sticker không còn trên kênh thì 422 và không tạo tin', function () {
    fakeStickerSendBridge(detail: []);

    postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', 'sticker_id' => '98930'])
        ->assertStatus(422)
        ->assertExactJson(['error' => __('errors.stickers.not_found', [], 'vi')]);

    expect($this->conversation->messages()->count())->toBe(0);
});

it('từ chối sticker trong ghi chú riêng, kèm tệp, hoặc thiếu mã — không tạo tin, không để lại tệp', function (array $payload, string $reason) {
    Storage::fake();
    fakeStickerSendBridge();

    postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', ...$payload])
        ->assertStatus(422)
        ->assertExactJson(['error' => __("errors.stickers.{$reason}", [], 'vi')]);

    expect($this->conversation->messages()->count())->toBe(0)
        ->and(Storage::allFiles())->toBe([])
        ->and(stickerSendRequests('/personal-messages/stickers/detail'))->toBeEmpty();
})->with([
    'ghi chú riêng' => [['sticker_id' => '98930', 'private' => true], 'private_note'],
    'kèm tệp' => [fn () => ['sticker_id' => '98930', 'attachments' => [UploadedFile::fake()->image('a.png')]], 'with_attachments'],
    'thiếu mã' => [['sticker_id' => '  '], 'missing_sticker_id'],
]);

it('tin sticker phía khách tạo qua API bị từ chối', function () {
    fakeStickerSendBridge();
    $apiInbox = Inbox::factory()->create(['account_id' => $this->inbox->account_id]);
    $apiInbox->addMembers([$this->agent->id]);
    $conversation = Conversation::factory()->create(['account_id' => $apiInbox->account_id, 'inbox_id' => $apiInbox->id]);

    postStickerMessage($this->agent, $conversation, ['content_type' => 'sticker', 'sticker_id' => '98930', 'message_type' => 'incoming'])
        ->assertStatus(422)
        ->assertExactJson(['error' => __('errors.stickers.outgoing_only', [], 'vi')]);

    expect($conversation->messages()->count())->toBe(0);
});

it('kênh không khai outbound_sticker thì 422', function () {
    fakeStickerSendBridge();
    $apiInbox = Inbox::factory()->create(['account_id' => $this->inbox->account_id]);
    $apiInbox->addMembers([$this->agent->id]);
    $conversation = Conversation::factory()->create(['account_id' => $apiInbox->account_id, 'inbox_id' => $apiInbox->id]);

    postStickerMessage($this->agent, $conversation, ['content_type' => 'sticker', 'sticker_id' => '98930'])
        ->assertStatus(422)
        ->assertExactJson(['error' => __('errors.stickers.capability_not_supported', [], 'vi')]);

    expect($conversation->messages()->count())->toBe(0)
        ->and(stickerSendRequests('/personal-messages/stickers/detail'))->toBeEmpty();
});

it('content_attributes.sticker do client tự gửi bị bỏ — bridge nhận chữ, không nhận sticker', function () {
    fakeStickerSendBridge();

    $response = postStickerMessage($this->agent, $this->conversation, [
        'content' => 'Chào bạn',
        'content_attributes' => ['sticker' => ['id' => 1, 'cateId' => 1, 'type' => 1], 'in_reply_to' => null],
    ])->assertOk();

    $sends = stickerSendRequests('/personal-messages/send');

    expect(Message::findOrFail($response->json('id'))->content_attributes)->not->toHaveKey('sticker')
        ->and($sends)->toHaveCount(1)
        ->and($sends[0]['text'])->toBe('Chào bạn')
        ->and($sends[0]->data())->not->toHaveKey('sticker');
});

it('gửi lại tin sticker thất bại vẫn gửi đúng sticker', function () {
    fakeStickerSendBridge(send: Http::sequence()
        ->push(['ok' => false, 'message' => 'zalo timeout'], 500)
        ->push(['ok' => true, 'source_id' => 'sent-sticker-retry']));

    $message = Message::findOrFail(
        postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', 'sticker_id' => '98930'])
            ->assertOk()
            ->json('id'),
    );
    expect($message->status)->toBe(Message::STATUSES['failed']);

    $account = Account::find($this->conversation->account_id);
    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/retry")
        ->assertOk();

    $sends = stickerSendRequests('/personal-messages/send');

    expect($sends)->toHaveCount(2)
        ->and($sends[1]['sticker']['id'])->toBe(98930)
        ->and($sends[1]->data())->not->toHaveKey('text')
        ->and($message->refresh()->source_id)->toBe('sent-sticker-retry');
});

it('echo của sticker vừa gửi dội về không đẻ tin thứ hai', function () {
    fakeStickerSendBridge();
    postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', 'sticker_id' => '98930'])->assertOk();

    $echo = ChannelFixture::load('zalo/real/sticker');
    unset($echo['listener_data']);
    (new ZaloEventsJob([
        ...$echo,
        'connection_id' => $this->inbox->channel->connectionId(),
        'thread_id' => '9876543210',
        'peer_uid' => '9876543210',
        'source_id' => 'sent-sticker-1',
        'direction' => 'out',
        'is_self' => true,
    ]))->handle(app(BridgeEventService::class));

    expect($this->conversation->messages()->count())->toBe(1)
        ->and(Message::query()->where('source_id', 'sent-sticker-1')->count())->toBe(1);
});

it('sticker không có tệp nào phải chờ lưu nên gửi ra kênh ngay, không trễ', function () {
    fakeStickerSendBridge();
    app(StickerLibrary::class)->browse($this->inbox, 'chào', null);
    Queue::fake();

    postStickerMessage($this->agent, $this->conversation, ['content_type' => 'sticker', 'sticker_id' => '98930'])->assertOk();

    Queue::assertPushed(SendReplyJob::class, fn (SendReplyJob $job) => $job->delay === null);
});
