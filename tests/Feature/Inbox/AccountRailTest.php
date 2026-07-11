<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;

/**
 * P07 — spike #7: 2 tài khoản Zalo cùng workspace, cùng peer nhắn cả hai →
 * filter theo account đúng, count không merge chéo (đúng luật đếm
 * per-channel/per-account).
 *
 * @group inbox-account-rail
 */
it('lists channel_accounts with per-account conversation counts and filters conversations by account, no cross-account merge', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $accountA = ChannelAccount::create([
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_shop_a',
        'display_name' => 'Shop A',
        'status' => 'connected',
    ]);
    $accountB = ChannelAccount::create([
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_shop_b',
        'display_name' => 'Shop B',
        'status' => 'session_lost',
    ]);

    // Cùng 1 peer nhắn tới CẢ HAI tài khoản — phải tách 2 hộp riêng, không merge chéo.
    Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountA->id,
        'peer_uid' => 'peer_common',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);
    Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountB->id,
        'peer_uid' => 'peer_common',
        'thread_type' => 0,
        'conversation_number' => 2,
    ]);
    // Thêm 1 hội thoại riêng cho account A (peer khác) để count phân biệt rõ.
    Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountA->id,
        'peer_uid' => 'peer_a_only',
        'thread_type' => 0,
        'conversation_number' => 3,
    ]);

    $response = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('inbox.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('channelAccounts', 2)
        ->where('channelAccounts.0.display_name', 'Shop A')
        ->where('channelAccounts.0.conversations_count', 2)
        ->where('channelAccounts.1.display_name', 'Shop B')
        ->where('channelAccounts.1.conversations_count', 1)
        ->where('conversations.total', 3)
    );

    // Filter theo account A → chỉ 2 hội thoại của A, KHÔNG lẫn hội thoại của B dù cùng peer_uid.
    $filtered = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('inbox.index', ['channel_account_id' => $accountA->id]))
        ->assertOk();

    $filtered->assertInertia(fn ($page) => $page
        ->where('conversations.total', 2)
        ->where('conversations.data.0.channel_account.display_name', fn ($name) => in_array($name, ['Shop A'], true))
    );
})->group('inbox-account-rail');

it('shows the account needing a QR re-scan (session_lost/needs_qr status)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    ChannelAccount::create([
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_lost',
        'display_name' => 'Cửa hàng mất kết nối',
        'status' => 'session_lost',
    ]);

    $response = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('inbox.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->where('channelAccounts.0.status', 'session_lost')
    );
})->group('inbox-account-rail');

it('account disconnected (ngắt chủ động) biến mất khỏi channelAccounts VÀ hội thoại của nó ẩn khỏi list + count', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $connected = ChannelAccount::create([
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_still_on',
        'display_name' => 'Còn kết nối',
        'status' => 'connected',
    ]);
    $disconnected = ChannelAccount::create([
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_cut_off',
        'display_name' => 'Đã ngắt',
        'status' => 'disconnected',
    ]);

    Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $connected->id,
        'peer_uid' => 'peer_on',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);
    Conversation::create([
        'channel' => 'zalo_personal',
        'channel_account_id' => $disconnected->id,
        'peer_uid' => 'peer_off',
        'thread_type' => 0,
        'conversation_number' => 2,
    ]);

    // Conversation legacy chưa gắn account — không thuộc account nào nên vẫn hiển thị
    Conversation::create([
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_legacy',
        'thread_type' => 0,
        'conversation_number' => 3,
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('inbox.index'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $page->has('channelAccounts', 1)
                ->where('channelAccounts.0.display_name', 'Còn kết nối')
                ->where('conversations.total', 2); // account ngắt ẩn; connected + legacy còn

            $peerUids = collect($page->toArray()['props']['conversations']['data'])->pluck('peer_uid');
            expect($peerUids)->toContain('peer_on')->toContain('peer_legacy')->not->toContain('peer_off');

            return $page;
        });
})->group('inbox-account-rail');
