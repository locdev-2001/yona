<?php

use App\Models\ChannelAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Zalo\PromoteAccountBinder;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Kiểm tra reconnect Zalo cùng tài khoản không bị unique-violation.
 *
 * Bug gốc: (workspace_id, personal_uid) unique index là PLAIN — soft-deleted row
 * vẫn chiếm slot → 23505 khi promote connection mới với cùng personal_uid.
 *
 * Fix:
 *   1. Partial unique index (WHERE deleted_at IS NULL AND personal_uid IS NOT NULL)
 *   2. promote() dedup: soft-delete active slots trùng personal_uid trước khi update
 *
 * @group channel-zalo
 */
beforeEach(function () {
    TenantScope::forget();
    config([
        'services.zalo_bridge.ui_secret' => 'test-ui-secret',
        'integrations.zalo_personal.enabled' => true,
    ]);
});

afterEach(function () {
    TenantScope::forget();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert a ZaloConnection row qua pgsql_privileged (bypass RLS).
 * Trả về connection_id (bigint từ sequence).
 */
function makeZaloSlot(string $workspaceId, ?string $personalUid = null, string $state = 'connected', ?string $deletedAt = null): int
{
    $connId = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspaceId,
        'connection_id' => $connId,
        'personal_uid' => $personalUid,
        'display_name' => 'Test Zalo',
        'state' => $state,
        'deleted_at' => $deletedAt,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $connId;
}

/**
 * Tạo user có permission tenant.zalo.manage trong workspace, bind context.
 */
function makeZaloManager(Workspace $ws): User
{
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    app(PermissionRegistrar::class)->setPermissionsTeamId($ws->id);
    $perm = Permission::firstOrCreate(['name' => 'tenant.zalo.manage', 'guard_name' => 'web']);
    $user->givePermissionTo($perm);

    return $user;
}

/**
 * Tạo conversation Zalo (key theo channel_account_id, P08) với $messageCount message
 * (source_id tuần tự). $channelAccountId mô phỏng data ĐÃ qua P02 backfill (dedup theo
 * DuplicateConversationMerger cần channel_account_id NOT NULL để tìm nhóm trùng).
 * Trả về conversation id (uuid).
 */
function makeZaloConversation(string $workspaceId, string $peerUid, int $messageCount, string $sourcePrefix, ?string $channelAccountId = null): string
{
    // Default connection (transacted, RLS-bound) — khớp với InboundMessageService và
    // PromoteAccountBinder trong promote(); rollback sạch sau test.
    $convId = (string) Str::uuid();

    DB::table('conversations')->insert([
        'id' => $convId,
        'workspace_id' => $workspaceId,
        'channel' => 'zalo_personal',
        'channel_account_id' => $channelAccountId,
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'peer_name' => 'Em Bé',
        'conversation_number' => random_int(1, 99999),
        'unread_count' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    for ($i = 1; $i <= $messageCount; $i++) {
        DB::table('messages')->insert([
            'id' => (string) Str::uuid(),
            'workspace_id' => $workspaceId,
            'conversation_id' => $convId,
            'direction' => 'in',
            'type' => 'text',
            'body' => "tin {$sourcePrefix} {$i}",
            'source_id' => "{$sourcePrefix}_{$i}",
            'platform_sent_at' => now()->subMinutes($messageCount - $i),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    return $convId;
}

// ── Test 1: Soft-deleted slot không chặn reconnect ────────────────────────────

it('reconnecting after soft-delete does not throw 23505 — partial unique allows it', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);

    // Slot cũ: đã soft-deleted (disconnect trước đó)
    makeZaloSlot($ws->id, 'uid_reconnect_1', 'disconnected', now()->toDateTimeString());

    // Slot mới: qr_waiting, chưa có personal_uid
    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        '*/auth/qr/promote' => Http::response([
            'personal_uid' => 'uid_reconnect_1',
            'display_name' => 'Nguyễn Văn A',
            'avatar' => 'https://example.com/avatar.jpg',
        ], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
        ])
        ->assertStatus(200)
        ->assertJson(['ok' => true]);

    // Slot mới phải ở trạng thái connected.
    // Đọc qua connection MẶC ĐỊNH (không pgsql_privileged): PromoteAccountBinder (P04)
    // ghi qua connection mặc định (RLS-bound, cùng session request) — đọc qua session
    // khác (pgsql_privileged) không thấy được thay đổi còn trong transaction test-wrap.
    $active = DB::table('zalo_connections')
        ->where('connection_id', $newConnId)
        ->whereNull('deleted_at')
        ->first();

    expect($active)->not->toBeNull();
    expect($active->state)->toBe('connected');
    expect($active->personal_uid)->toBe('uid_reconnect_1');
})->group('channel-zalo');

// ── Test 2: Active slot trùng personal_uid → dedup (latest wins) ─────────────

it('promoting a slot to an already-active personal_uid soft-deletes the old slot — latest wins', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);

    // Slot cũ: đang connected với personal_uid
    $oldConnId = makeZaloSlot($ws->id, 'uid_latest_wins', 'connected');

    // Slot mới: qr_waiting
    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        '*/auth/qr/promote' => Http::response([
            'personal_uid' => 'uid_latest_wins',
            'display_name' => 'Nguyễn Văn A',
            'avatar' => 'https://example.com/avatar.jpg',
        ], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
        ])
        ->assertStatus(200)
        ->assertJson(['ok' => true]);

    // Slot cũ phải bị soft-delete + state=session_lost (P04: PromoteAccountBinder — đọc
    // qua connection mặc định, xem ghi chú Test 1).
    $old = DB::table('zalo_connections')
        ->where('connection_id', $oldConnId)
        ->first();

    expect($old->deleted_at)->not->toBeNull();
    expect($old->state)->toBe('session_lost');

    // Slot mới phải connected và không bị xóa
    $new = DB::table('zalo_connections')
        ->where('connection_id', $newConnId)
        ->whereNull('deleted_at')
        ->first();

    expect($new)->not->toBeNull();
    expect($new->state)->toBe('connected');
    expect($new->personal_uid)->toBe('uid_latest_wins');

    // Chỉ có đúng 1 active slot với personal_uid này
    $activeCount = DB::table('zalo_connections')
        ->where('workspace_id', $ws->id)
        ->where('personal_uid', 'uid_latest_wins')
        ->whereNull('deleted_at')
        ->count();

    expect($activeCount)->toBe(1);
})->group('channel-zalo');

// ── Test 3: Reconnect gộp conversation cũ → 1 thread, không mất message ───────

it('reconnect keeps the prior conversation+messages intact (account-keyed — no fork, no message loss)', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);
    $peer = 'peer_em_be';

    // Account đã tồn tại (mô phỏng data qua P02 backfill hoặc lần connect trước).
    $account = ChannelAccount::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_merge',
        'status' => 'session_lost',
    ]);

    // Slot cũ + conversation cũ (3 message), đã gắn channel_account_id (post-backfill).
    $oldConnId = makeZaloSlot($ws->id, 'uid_merge', 'connected');
    $oldConv = makeZaloConversation($ws->id, $peer, 3, 'old', $account->id);

    // Slot mới: qr_waiting (chưa có conversation)
    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        '*/auth/qr/promote' => Http::response([
            'personal_uid' => 'uid_merge',
            'display_name' => 'Em Bé',
            'avatar' => null,
        ], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
        ])
        ->assertStatus(200)
        ->assertJson(['ok' => true]);

    // Chỉ còn ĐÚNG 1 conversation active cho peer này trong workspace — đúng conversation cũ,
    // không fork (không có duplicate để merge vì slot mới CHƯA có conversation riêng).
    $activeConvs = DB::table('conversations')
        ->where('workspace_id', $ws->id)
        ->where('peer_uid', $peer)
        ->whereNull('deleted_at')
        ->get(['id', 'channel_account_id']);

    expect($activeConvs)->toHaveCount(1);
    expect($activeConvs[0]->id)->toBe($oldConv);
    expect($activeConvs[0]->channel_account_id)->toBe($account->id);

    // Tất cả 3 message vẫn nguyên vẹn dưới conversation này.
    $msgCount = DB::table('messages')->where('conversation_id', $oldConv)->count();
    expect($msgCount)->toBe(3);
})->group('channel-zalo');

// ── Test 4: Reconnect khi cả 2 slot có conversation cùng peer → merge message, né 23505 ──

// Test "2 duplicate active conversations cho cùng (channel_account_id, peer_uid)" đã
// XOÁ: kể từ P02(g) swap, constraint conversations_channel_account_peer_unique (partial,
// deleted_at IS NULL) khiến kịch bản này KHÔNG THỂ xảy ra qua ứng dụng nữa — INSERT thứ 2
// tự 23505 ngay lập tức, đúng như thiết kế. PromoteAccountBinder::mergeDuplicateConversationsFor()
// vẫn giữ lại như lưới an toàn cho dữ liệu lịch sử/thao tác SQL trực tiếp, không còn
// đường tái tạo qua code path bình thường để viết test tích hợp cho nó nữa.

// ── P04: first-connect tạo channel_account + gắn slot ──────────────────────────

it('P04(a): first-connect creates a channel_account and binds the slot to it', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);

    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        '*/auth/qr/promote' => Http::response([
            'personal_uid' => 'uid_first_connect',
            'display_name' => 'Cửa hàng ABC',
            'avatar' => null,
        ], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
        ])
        ->assertStatus(200)
        ->assertJson(['ok' => true]);

    $account = DB::table('channel_accounts')
        ->where('workspace_id', $ws->id)
        ->where('account_uid', 'uid_first_connect')
        ->first();

    expect($account)->not->toBeNull();
    expect($account->status)->toBe('connected');
    expect($account->display_name)->toBe('Cửa hàng ABC');

    $slot = DB::table('zalo_connections')->where('connection_id', $newConnId)->first();
    expect($slot->channel_account_id)->toBe($account->id);
})->group('channel-zalo');

// ── P04(c): quét nhầm tài khoản → 409, KHÔNG bind, bridge logout slot mới ─────

it('P04(c): expected_account_uid mismatch returns 409, does not bind, and logs out the new slot', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);

    // Account đã tồn tại (reconnect flow — FE gửi expected_account_uid từ connection cũ).
    $oldConnId = makeZaloSlot($ws->id, 'uid_correct_account', 'session_lost');
    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        // Bridge trả uid KHÁC với expected — người dùng quét nhầm tài khoản Zalo khác.
        '*/auth/qr/promote' => Http::response(['personal_uid' => 'uid_wrong_account', 'display_name' => 'Ai đó'], 200),
        '*/auth/logout' => Http::response(['ok' => true], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
            'expected_account_uid' => 'uid_correct_account',
        ])
        ->assertStatus(409)
        ->assertJson(['ok' => false, 'error_code' => 'zalo_account_mismatch']);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout'));

    // KHÔNG bind: slot mới vẫn qr_waiting, không tạo channel_account cho uid sai.
    $newSlot = DB::table('zalo_connections')->where('connection_id', $newConnId)->first();
    expect($newSlot->state)->toBe('qr_waiting');
    expect($newSlot->channel_account_id)->toBeNull();

    expect(DB::table('channel_accounts')->where('account_uid', 'uid_wrong_account')->exists())->toBeFalse();

    // Slot cũ (tài khoản đúng) không bị đụng.
    $oldSlot = DB::table('zalo_connections')->where('connection_id', $oldConnId)->first();
    expect($oldSlot->state)->toBe('session_lost');
})->group('channel-zalo');

// ── P04(d): DB fail sau khi bridge đã promote → logout slot mới, không mồ côi ──

it('P04(d): DB failure after successful bridge promote logs out the new slot and returns 500 (no orphan connected slot)', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);

    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');

    Http::fake([
        '*/auth/qr/promote' => Http::response(['personal_uid' => 'uid_db_fail', 'display_name' => 'X'], 200),
        '*/auth/logout' => Http::response(['ok' => true], 200),
    ]);

    $this->mock(PromoteAccountBinder::class, function ($mock) {
        $mock->shouldReceive('bind')->andThrow(new RuntimeException('simulated DB failure'));
    });

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $newConnId,
            'qr_token' => 'fake-qr-token',
        ])
        ->assertStatus(500)
        ->assertJson(['ok' => false]);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout'));

    // Slot mới KHÔNG bị để mồ côi ở state=connected — vẫn nguyên qr_waiting (bind() throw trước khi ghi DB thật).
    $slot = DB::table('zalo_connections')->where('connection_id', $newConnId)->first();
    expect($slot->state)->toBe('qr_waiting');
})->group('channel-zalo');
