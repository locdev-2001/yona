<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * P06a — quote-reply + reaction + sticker outbound. Caller ĐẦU TIÊN của
 * dispatcher /zca: gate meta như quote (HIGH-1), ghi DB SAU 2xx, B1 workspace_token.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function oiSetup(bool $withSlot = true): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_oi_'.uniqid(),
        'status' => 'connected',
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'peer_uid' => 'peer_oi_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    if ($withSlot) {
        ZaloConnection::create([
            'workspace_id' => $workspace->id,
            'connection_id' => ZaloConnection::nextConnectionId(),
            'channel_account_id' => $account->id,
            'state' => 'connected',
            'lock_version' => 0,
        ]);
    }

    return [$workspace, $account, $conversation];
}

function oiMessage(Conversation $conversation, array $overrides = []): Message
{
    return Message::create(array_merge([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin khách',
        'source_id' => 'oi_src_'.uniqid(),
        'platform_sent_at' => now(),
        'platform_meta' => [
            'zca_message' => [
                'msgId' => 'oi_msg_'.uniqid(),
                'cliMsgId' => '175160000'.rand(1000, 9999),
                'uidFrom' => '111222333',
                'msgType' => 'webchat',
                'ts' => '1751600000123',
                'content' => 'tin khách',
                'ttl' => 0,
            ],
        ],
    ], $overrides));
}

// ── Quote-reply ──────────────────────────────────────────────────────────────

it('quote-reply: bridge nhận quote object đủ field từ platform_meta, message lưu media_meta.quote', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    [, , $conversation] = oiSetup();
    $original = oiMessage($conversation);

    Http::fake(['*personal-messages/send*' => Http::response(['ok' => true, 'source_id' => 'q_out_1'], 200)]);

    $response = $this->postJson(route('inbox.send', $conversation->id), [
        'text' => 'Dạ em trả lời ạ',
        'reply_to_message_id' => $original->id,
    ]);

    $response->assertCreated();

    Http::assertSent(function ($request) use ($original) {
        $quote = $request['quote'] ?? null;
        $zca = $original->platform_meta['zca_message'];

        return $quote !== null
            && $quote['msgId'] === $zca['msgId']
            && $quote['cliMsgId'] === $zca['cliMsgId']
            && $quote['uidFrom'] === $zca['uidFrom']
            && $quote['msgType'] === 'webchat'
            && $quote['ts'] === $zca['ts']
            && $quote['content'] === 'tin khách';
    });

    $sent = Message::where('conversation_id', $conversation->id)->where('direction', 'out')->sole();
    expect($sent->media_meta['quote']['text'])->toBe('tin khách')
        ->and($sent->media_meta['quote']['msg_id'])->toBe($original->source_id);

    Carbon::setTestNow();
});

it('quote tin CŨ thiếu platform_meta → 422 quote_unavailable, KHÔNG gọi bridge (fallback trung thực)', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    [, , $conversation] = oiSetup();
    $legacy = oiMessage($conversation, ['platform_meta' => []]);

    Http::fake();

    $response = $this->postJson(route('inbox.send', $conversation->id), [
        'text' => 'reply tin cũ',
        'reply_to_message_id' => $legacy->id,
    ]);

    $response->assertStatus(422);
    expect($response->json('error_code'))->toBe('quote_unavailable');
    Http::assertNothingSent();

    Carbon::setTestNow();
});

it('quote reply_to của conversation khác → 404', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    [$workspace, , $conversation] = oiSetup();
    $otherConv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_khac_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
    $foreign = oiMessage($otherConv);

    $this->postJson(route('inbox.send', $conversation->id), [
        'text' => 'x',
        'reply_to_message_id' => $foreign->id,
    ])->assertNotFound();

    Carbon::setTestNow();
});

// ── Sticker ──────────────────────────────────────────────────────────────────

it('gửi sticker: bridge nhận {id, cateId, type}, message type=sticker + media_meta.sticker có url', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    [, , $conversation] = oiSetup();
    // Có inbound gần → isReply → miễn cap QC
    oiMessage($conversation);

    Http::fake(['*personal-messages/send*' => Http::response(['ok' => true, 'source_id' => 'stk_1'], 200)]);

    $response = $this->postJson(route('inbox.send', $conversation->id), [
        'sticker' => ['id' => 12345, 'cate_id' => 66, 'type' => 1, 'url' => 'https://zalo-api.zadn.vn/stk.webp'],
    ]);

    $response->assertCreated();

    Http::assertSent(fn ($request) => ($request['sticker']['id'] ?? null) === 12345
        && ($request['sticker']['cateId'] ?? null) === 66);

    $sent = Message::where('conversation_id', $conversation->id)->where('direction', 'out')->sole();
    expect($sent->type)->toBe('sticker')
        ->and($sent->media_meta['sticker']['url'])->toBe('https://zalo-api.zadn.vn/stk.webp');

    Carbon::setTestNow();
});

// ── Reaction ─────────────────────────────────────────────────────────────────

it('reaction: dispatcher 2xx → ghi message_reactions (reactor = account_uid), KHÔNG optimistic', function () {
    [, $account, $conversation] = oiSetup();
    $message = oiMessage($conversation);

    Http::fake(['*zca/addReaction*' => Http::response(['ok' => true, 'result' => ['msgIds' => [1]]], 200)]);

    $response = $this->postJson(route('inbox.reaction', [$conversation->id, $message->id]), ['icon' => '/-heart']);

    $response->assertOk();
    $reaction = MessageReaction::where('message_id', $message->id)->sole();
    expect($reaction->icon)->toBe('/-heart')
        ->and($reaction->reactor_uid)->toBe($account->account_uid);

    // B1 workspace_token phải được gửi kèm
    Http::assertSent(fn ($request) => str_contains($request->url(), '/zca/addReaction')
        && ! empty($request['workspace_token'])
        && $request['args'][0] === '/-heart'
        && $request['args'][1]['data']['msgId'] === $message->platform_meta['zca_message']['msgId']);
});

it('reaction dispatcher LỖI → KHÔNG ghi row (tránh optimistic misfire lệch 2 chiều)', function () {
    [, , $conversation] = oiSetup();
    $message = oiMessage($conversation);

    Http::fake(['*zca/addReaction*' => Http::response(['ok' => false, 'message' => 'slot_not_ready'], 404)]);

    $this->postJson(route('inbox.reaction', [$conversation->id, $message->id]), ['icon' => '/-heart'])
        ->assertStatus(422);

    expect(MessageReaction::where('message_id', $message->id)->count())->toBe(0);
});

it('reaction tin thiếu meta (msgId/cliMsgId) → 422 reaction_unavailable, KHÔNG gọi dispatcher (HIGH-1)', function () {
    [, , $conversation] = oiSetup();
    $legacy = oiMessage($conversation, ['platform_meta' => ['zca_message' => ['msgId' => 'only_msgid']]]);

    Http::fake();

    $response = $this->postJson(route('inbox.reaction', [$conversation->id, $legacy->id]), ['icon' => '/-heart']);

    $response->assertStatus(422);
    expect($response->json('error_code'))->toBe('reaction_unavailable');
    Http::assertNothingSent();
});

it('reaction không có permission tenant.zalo.manage → 403', function () {
    [$workspace, , $conversation] = oiSetup();
    $message = oiMessage($conversation);

    // Member thường (sales_rep KHÔNG có tenant.zalo.manage)
    $member = User::factory()->create();
    actingInWorkspace($workspace, $member);
    seedMember($workspace, $member, 'sales_rep');

    $this->postJson(route('inbox.reaction', [$conversation->id, $message->id]), ['icon' => '/-heart'])
        ->assertForbidden();
});

// ── Sticker search ───────────────────────────────────────────────────────────

it('sticker search: getStickers → getStickersDetail qua dispatcher, cache theo keyword', function () {
    [, , $conversation] = oiSetup();

    // Pattern cụ thể TRƯỚC — '*getStickers*' cũng khớp URL getStickersDetail
    Http::fake([
        '*zca/getStickersDetail*' => Http::response(['ok' => true, 'result' => [
            ['id' => 11, 'cateId' => 5, 'type' => 1, 'stickerUrl' => 'https://s.zadn.vn/11.webp', 'text' => 'hello'],
            ['id' => 22, 'cateId' => 5, 'type' => 1, 'stickerUrl' => 'https://s.zadn.vn/22.webp'],
        ]], 200),
        '*zca/getStickers*' => Http::response(['ok' => true, 'result' => [11, 22]], 200),
    ]);

    $response = $this->getJson(route('inbox.stickers', $conversation->id).'?q=hello');

    $response->assertOk();
    expect($response->json('stickers'))->toHaveCount(2)
        ->and($response->json('stickers.0.id'))->toBe(11)
        ->and($response->json('stickers.0.url'))->toBe('https://s.zadn.vn/11.webp');

    // Lần 2 cùng keyword → cache, KHÔNG thêm HTTP call
    $this->getJson(route('inbox.stickers', $conversation->id).'?q=hello')->assertOk();
    Http::assertSentCount(2);
});
