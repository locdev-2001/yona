<?php

use App\Jobs\Webhooks\ZaloEventsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Zalo\BridgeEventService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\Feature\Channels\ChannelFixture;

// Bảng chọn sticker của khung soạn: "gần đây" đọc từ chính tin trong hộp thư, tìm
// kiếm và theo bộ thì hỏi danh mục của kênh. Bridge Zalo giả bằng Http::fake.

const STICKER_FIXTURE_URL = 'https://cdn.zalo.test/api/emoticon/sticker/webpc?eid=98930&size=130';

/** @param array<string, mixed> $stickerResponse */
function fakeStickerBridge(array $stickerResponse = ['ok' => true, 'stickers' => []], int $status = 200): void
{
    Http::fake([
        'cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
        zaloBridgePattern('personal-messages/stickers/*') => Http::response($stickerResponse, $status),
        zaloBridgePattern('personal-messages/send') => fn () => Http::response(['ok' => true, 'source_id' => 'sent-'.Str::uuid()]),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
}

/** @return list<ClientRequest> */
function stickerBridgeRequests(string $route): array
{
    return collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (ClientRequest $request) => str_ends_with($request->url(), "/personal-messages/stickers/{$route}"))
        ->values()
        ->all();
}

function stickersUrl(Account $account, Conversation $conversation, array $query = []): string
{
    $url = "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/stickers";

    return $query === [] ? $url : $url.'?'.http_build_query($query);
}

/** Sticker khách gửi, đúng payload thật của bridge (bộ ghi là `catId`). */
function receiveZaloSticker(Zalo $channel, string $sourceId): Message
{
    $payload = ChannelFixture::load('zalo/real/sticker');
    $payload['source_id'] = $sourceId;
    $payload['listener_data']['msgId'] = $sourceId;
    $payload['platform_sent_at'] = now()->getTimestampMs();

    (new ZaloEventsJob([...$payload, 'connection_id' => $channel->connectionId()]))->handle(app(BridgeEventService::class));

    return Message::query()->where('source_id', $sourceId)->firstOrFail();
}

function agentSticker(Conversation $conversation, array $sticker): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => $sticker],
    ]);
}

// Http::fake cộng dồn stub và stub đăng ký trước thắng: mỗi case tự gọi
// fakeStickerBridge đúng một lần với phản hồi của riêng nó.
beforeEach(function () {
    $this->inbox = Inbox::factory()->zalo()->create();
    $this->account = Account::find($this->inbox->account_id);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $this->inbox->addMembers([$this->agent->id]);
});

it('mặc định trả sticker gần đây của hộp thư, mới nhất trước, bỏ trùng, kèm bộ — không gọi kênh', function () {
    fakeStickerBridge();
    $conversation = receiveZaloSticker($this->inbox->channel, 'stk-1')->conversation;
    $this->travel(1)->minutes();
    agentSticker($conversation, ['id' => 50626, 'cateId' => 12658, 'type' => 3, 'url' => 'https://cdn.zalo.test/50626.webp']);
    $this->travel(1)->minutes();
    receiveZaloSticker($this->inbox->channel, 'stk-2');
    // Tin sticker thiếu ảnh không dựng lại được — bỏ qua chứ không vỡ cả danh sách.
    $this->travel(1)->minutes();
    agentSticker($conversation, ['id' => 1, 'text' => '[^1.1^]']);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation))
        ->assertOk()
        ->assertExactJson([
            'source' => 'recent',
            'query' => null,
            'pack_id' => null,
            'stickers' => [
                ['id' => '98930', 'image_url' => STICKER_FIXTURE_URL, 'pack_id' => '61900', 'label' => null],
                ['id' => '50626', 'image_url' => 'https://cdn.zalo.test/50626.webp', 'pack_id' => '12658', 'label' => null],
            ],
            'packs' => [
                ['id' => '61900', 'cover_url' => STICKER_FIXTURE_URL],
                ['id' => '12658', 'cover_url' => 'https://cdn.zalo.test/50626.webp'],
            ],
        ]);

    expect(Http::recorded(fn (ClientRequest $request) => str_contains($request->url(), '/personal-messages/stickers/')))->toBeEmpty();
});

it('tìm theo từ khoá gọi kênh một lần, lần sau cùng từ khoá (khác hoa thường, thừa khoảng trắng) lấy từ cache', function () {
    fakeStickerBridge(['ok' => true, 'stickers' => [
        ['id' => 98930, 'cate_id' => 61900, 'type' => 7, 'url' => STICKER_FIXTURE_URL, 'label' => 'Cảm ơn'],
        ['id' => 0, 'url' => 'https://cdn.zalo.test/hong.webp'],
        ['id' => 98931, 'cate_id' => 61900, 'type' => 7, 'url' => 'javascript:alert(1)'],
    ]]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => 'cảm ơn']))
        ->assertOk()
        ->assertJsonPath('source', 'search')
        ->assertJsonPath('query', 'cảm ơn')
        ->assertJsonPath('packs', [])
        ->assertJsonPath('stickers', [
            ['id' => '98930', 'image_url' => STICKER_FIXTURE_URL, 'pack_id' => '61900', 'label' => 'Cảm ơn'],
        ]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => '  CẢM   ƠN ']))
        ->assertOk()
        ->assertJsonCount(1, 'stickers');

    $searches = stickerBridgeRequests('search');

    expect($searches)->toHaveCount(1)
        ->and($searches[0]['keyword'])->toBe('cảm ơn')
        ->and($searches[0]['connection_id'])->toBe($this->inbox->channel->connectionId())
        ->and($searches[0]->header('X-Bridge-Send-Secret'))->toBe([(string) config('zalo.bridge.send_secret')]);
});

it('từ khoá một ký tự coi như mặc định, không gọi kênh', function () {
    fakeStickerBridge();
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => 'a']))
        ->assertOk()
        ->assertJsonPath('source', 'recent');

    expect(stickerBridgeRequests('search'))->toBeEmpty();
});

it('mở một bộ gọi kênh theo mã bộ và dùng cache cho lần sau', function () {
    fakeStickerBridge(['ok' => true, 'stickers' => [
        ['id' => 98930, 'cate_id' => 61900, 'type' => 7, 'url' => STICKER_FIXTURE_URL, 'label' => null],
        ['id' => 98931, 'cate_id' => 61900, 'type' => 7, 'url' => 'https://cdn.zalo.test/98931.webp', 'label' => null],
    ]]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['pack' => '61900']))
        ->assertOk()
        ->assertJsonPath('source', 'pack')
        ->assertJsonPath('pack_id', '61900')
        ->assertJsonCount(2, 'stickers');

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['pack' => '61900']))->assertOk();

    $requests = stickerBridgeRequests('category');

    expect($requests)->toHaveCount(1)
        ->and($requests[0]['cate_id'])->toBe(61900);
});

it('hộp thư không khai outbound_sticker trả 422 capability_not_supported', function () {
    fakeStickerBridge();
    $apiInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $apiInbox->addMembers([$this->agent->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $apiInbox->id]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => 'chào']))
        ->assertStatus(422)
        ->assertExactJson([
            'error' => __('errors.stickers.capability_not_supported', [], $this->account->locale),
            'code' => 'capability_not_supported',
        ]);

    expect(Http::recorded(fn (ClientRequest $request) => str_contains($request->url(), '/personal-messages/stickers/')))->toBeEmpty();
});

it('kênh mất phiên thì báo câu dễ hiểu, và lỗi không vào cache', function () {
    fakeStickerBridge(['ok' => false, 'code' => 'session_lost', 'message' => 'not_logged_in'], 503);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    foreach ([1, 2] as $attempt) {
        $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => 'haha']))
            ->assertStatus(422)
            ->assertExactJson([
                'error' => __('errors.zalo.action.session_lost', [], $this->account->locale),
                'code' => 'session_lost',
            ]);
    }

    expect(stickerBridgeRequests('search'))->toHaveCount(2);
});

it('hộp thư Zalo đã ngắt kết nối thì báo mất phiên mà không gọi bridge', function () {
    fakeStickerBridge();
    $this->inbox->channel->update(['state' => Zalo::STATE_SESSION_LOST]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $this->actingAs($this->agent)->getJson(stickersUrl($this->account, $conversation, ['q' => 'haha']))
        ->assertStatus(422)
        ->assertJsonPath('code', 'session_lost');

    expect(stickerBridgeRequests('search'))->toBeEmpty();
});

it('agent không thuộc hộp thư thì 401', function () {
    fakeStickerBridge();
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id, 'role' => AccountUser::ROLE_AGENT]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

    $this->actingAs($outsider)->getJson(stickersUrl($this->account, $conversation))->assertUnauthorized();
});
