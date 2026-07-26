<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Services\Inbox\SeenSyncService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Support\MockChannelDriverA;

/**
 * P2 — contract đóng kín: diện tương tác (reaction, sticker, seen, verify SĐT,
 * resync) đi qua capability interface thay vì method_exists.
 *
 * Test 1-6 KHÓA HÀNH VI HIỆN TẠI: phải xanh TRƯỚC khi đổi contract và vẫn xanh
 * SAU, không sửa một dòng assert nào. Kênh không hỗ trợ một diện nào đó phải
 * hành xử y hệt hôm nay — bỏ qua êm với seen-sync, 422 tường minh với
 * verify/reaction.
 *
 * Test 7-9 mô tả HÀNH VI MỚI (authz + throttle cho resync/sticker) — đỏ trước.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** @return array{0: Workspace, 1: User, 2: Conversation, 3: ChannelAccount} */
function ccSetup(string $role = 'admin'): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, $role);

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_cc_'.uniqid(),
        'status' => 'connected',
    ]);
    ZaloConnection::create([
        'workspace_id' => $workspace->id,
        'connection_id' => ZaloConnection::nextConnectionId(),
        'channel_account_id' => $account->id,
        'state' => 'connected',
        'lock_version' => 0,
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'peer_uid' => 'peer_cc_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    return [$workspace, $user, $conversation, $account];
}

/** Tin inbound có đủ metadata nền tảng để reaction/seen dùng được. */
function ccInboundMessage(Conversation $conversation, string $suffix = ''): Message
{
    return Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'khách nhắn',
        'source_id' => 'cc_in_'.$suffix.uniqid(),
        'platform_sent_at' => now(),
        'platform_meta' => ['zca_message' => [
            'msgId' => 'cc_m'.$suffix, 'cliMsgId' => '123456', 'uidFrom' => $conversation->peer_uid,
            'idTo' => '0', 'msgType' => 'webchat', 'ts' => '1751600000000',
        ]],
    ]);
}

/** Đăng ký kênh KHÔNG hỗ trợ diện tương tác nào, để test nhánh "không hỗ trợ". */
function ccRegisterBareChannel(Workspace $workspace): Conversation
{
    app(ChannelRegistry::class)->extend('mock_a', fn () => new MockChannelDriverA);

    return Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'mock_a',
        'peer_uid' => 'peer_bare_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
}

// ── 1-6: khóa hành vi HIỆN TẠI (phải xanh trước và sau refactor) ─────────────

it('kênh không hỗ trợ seen → bỏ qua êm, không throw', function () {
    [$workspace] = ccSetup();
    $bare = ccRegisterBareChannel($workspace);
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $bare->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'khách nhắn',
        'source_id' => 'bare_in_'.uniqid(),
        'platform_sent_at' => now(),
        'platform_meta' => ['zca_message' => ['msgId' => 'x', 'cliMsgId' => 'y']],
    ]);

    Http::fake();

    app(SeenSyncService::class)->syncOnThreadOpen($bare);

    Http::assertNothingSent();
});

it('kênh không hỗ trợ verify SĐT → 422 verify_unsupported', function () {
    [$workspace] = ccSetup();
    $bare = ccRegisterBareChannel($workspace);

    $this->putJson(route('inbox.phone.update', $bare), ['phone' => '0901234567'])
        ->assertStatus(422)
        ->assertJsonPath('error_code', 'verify_unsupported');
});

it('reaction thiếu source_id → 422 reaction_unavailable', function () {
    [$workspace, , $conversation] = ccSetup();

    $message = Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin cũ không có source_id',
        'source_id' => null,
        'platform_sent_at' => now(),
    ]);

    $this->postJson(route('inbox.reaction', [$conversation, $message]), ['icon' => '/-heart'])
        ->assertStatus(422)
        ->assertJsonPath('error_code', 'reaction_unavailable');
});

it('reaction thành công → ghi message_reactions SAU khi platform trả 2xx', function () {
    [, , $conversation, $account] = ccSetup();
    $message = ccInboundMessage($conversation);

    Http::fake(['*zca/addReaction*' => Http::response(['ok' => true], 200)]);

    $this->postJson(route('inbox.reaction', [$conversation, $message]), ['icon' => '/-heart'])
        ->assertOk()
        ->assertJsonPath('ok', true);

    expect($message->reactions()->where('icon', '/-heart')->exists())->toBeTrue();
    expect($message->reactions()->value('reactor_uid'))->toBe($account->account_uid);
});

it('seen-sync tôn trọng debounce 4s + watermark', function () {
    [, , $conversation] = ccSetup();
    ccInboundMessage($conversation, 'a');
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    Http::fake(['*zca/sendSeenEvent*' => Http::response(['ok' => true], 200)]);
    $service = app(SeenSyncService::class);

    $service->syncOnThreadOpen($conversation);
    Http::assertSentCount(1);

    // Trong cửa sổ debounce → không gọi lại
    $service->syncOnThreadOpen($conversation);
    Http::assertSentCount(1);

    // Hết debounce nhưng watermark đã phủ tin cũ → vẫn không gọi lại
    Cache::forget('seen-sync:'.$conversation->id);
    $service->syncOnThreadOpen($conversation);
    Http::assertSentCount(1);
});

it('seen-sync bỏ qua hội thoại nhóm', function () {
    [$workspace] = ccSetup();
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY, true);
    Cache::flush();

    $group = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'group_cc_'.uniqid(),
        'thread_type' => 1,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
    ccInboundMessage($group, 'g');

    Http::fake();

    app(SeenSyncService::class)->syncOnThreadOpen($group);

    Http::assertNothingSent();
});

// ── 7-9: hành vi MỚI (đỏ trước khi sửa) ──────────────────────────────────────

it('member không có tenant.zalo.manage gọi /inbox/resync → 403', function () {
    ccSetup('sales_rep');

    $this->postJson(route('inbox.resync'))->assertForbidden();
});

it('resync quá 1 lần/5 phút/workspace → 429', function () {
    [$workspace] = ccSetup();
    RateLimiter::clear('inbox-resync:'.$workspace->id);

    Http::fake(['*' => Http::response(['messages' => []], 200)]);

    $this->postJson(route('inbox.resync'))->assertOk();
    $this->postJson(route('inbox.resync'))->assertStatus(429);
});

it('sticker search quá 10 lần/60s → 429', function () {
    [, $user, $conversation] = ccSetup();
    RateLimiter::clear('sticker-search:'.$user->id);

    Http::fake(['*zca/*' => Http::response(['result' => []], 200)]);

    for ($i = 0; $i < 10; $i++) {
        $this->getJson(route('inbox.stickers', $conversation).'?q=cuoi'.$i)->assertOk();
    }

    $this->getJson(route('inbox.stickers', $conversation).'?q=vuot-nguong')->assertStatus(429);
});
