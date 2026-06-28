<?php

use App\Models\User;
use App\Models\Workspace;
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
 * Tạo conversation Zalo dưới $connectionId với $messageCount message (source_id tuần tự).
 * Trả về conversation id (uuid).
 */
function makeZaloConversation(string $workspaceId, int $connectionId, string $peerUid, int $messageCount, string $sourcePrefix): string
{
    // Default connection (transacted, RLS-bound) — khớp với InboundMessageService và
    // ZaloConversationMerger trong promote(); rollback sạch sau test.
    $convId = (string) Str::uuid();

    DB::table('conversations')->insert([
        'id' => $convId,
        'workspace_id' => $workspaceId,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $connectionId,
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

    // Slot mới phải ở trạng thái connected
    $active = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
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

    // Slot cũ phải bị soft-delete và set state=disconnected
    $old = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
        ->where('connection_id', $oldConnId)
        ->first();

    expect($old->deleted_at)->not->toBeNull();
    expect($old->state)->toBe('disconnected');

    // Slot mới phải connected và không bị xóa
    $new = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
        ->where('connection_id', $newConnId)
        ->whereNull('deleted_at')
        ->first();

    expect($new)->not->toBeNull();
    expect($new->state)->toBe('connected');
    expect($new->personal_uid)->toBe('uid_latest_wins');

    // Chỉ có đúng 1 active slot với personal_uid này
    $activeCount = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
        ->where('workspace_id', $ws->id)
        ->where('personal_uid', 'uid_latest_wins')
        ->whereNull('deleted_at')
        ->count();

    expect($activeCount)->toBe(1);
})->group('channel-zalo');

// ── Test 3: Reconnect gộp conversation cũ → 1 thread, không mất message ───────

it('reconnect merges prior conversation+messages into the new one — no fork, no message loss', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);
    $peer = 'peer_em_be';

    // Slot cũ + conversation cũ (3 message)
    $oldConnId = makeZaloSlot($ws->id, 'uid_merge', 'connected');
    $oldConv = makeZaloConversation($ws->id, $oldConnId, $peer, 3, 'old');

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

    // Chỉ còn ĐÚNG 1 conversation active cho peer này trong workspace
    $activeConvs = DB::table('conversations')
        ->where('workspace_id', $ws->id)
        ->where('peer_uid', $peer)
        ->whereNull('deleted_at')
        ->get(['id', 'zalo_connection_id']);

    expect($activeConvs)->toHaveCount(1);
    expect((int) $activeConvs[0]->zalo_connection_id)->toBe($newConnId);

    // Tất cả 3 message được bảo toàn dưới conversation đích
    $msgCount = DB::table('messages')
        ->where('conversation_id', $activeConvs[0]->id)
        ->count();
    expect($msgCount)->toBe(3);

    // Conversation cũ đã re-point sang cid mới — không còn active dưới cid cũ
    $oldStillActive = DB::table('conversations')
        ->where('id', $oldConv)
        ->whereNull('deleted_at')
        ->where('zalo_connection_id', $oldConnId)
        ->exists();
    expect($oldStillActive)->toBeFalse();
})->group('channel-zalo');

// ── Test 4: Reconnect khi cả 2 slot có conversation cùng peer → merge message, né 23505 ──

it('reconnect merges messages when both slots already have a conversation for the peer — no 23505', function () {
    $ws = Workspace::factory()->create();
    $user = makeZaloManager($ws);
    $peer = 'peer_dup_thread';

    // Slot cũ + conversation cũ (3 message, source old_1..3)
    $oldConnId = makeZaloSlot($ws->id, 'uid_dup', 'connected');
    $oldConv = makeZaloConversation($ws->id, $oldConnId, $peer, 3, 'old');

    // Slot mới ĐÃ có conversation cho cùng peer (2 message, source new_1..2)
    // — mô phỏng inbound đã đến slot mới trước khi promote.
    $newConnId = makeZaloSlot($ws->id, null, 'qr_waiting');
    $newConv = makeZaloConversation($ws->id, $newConnId, $peer, 2, 'new');

    Http::fake([
        '*/auth/qr/promote' => Http::response([
            'personal_uid' => 'uid_dup',
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

    // ĐÚNG 1 conversation active cho peer → conversation của slot mới
    $activeConvs = DB::table('conversations')
        ->where('workspace_id', $ws->id)
        ->where('peer_uid', $peer)
        ->whereNull('deleted_at')
        ->get(['id']);

    expect($activeConvs)->toHaveCount(1);
    expect($activeConvs[0]->id)->toBe($newConv);

    // Toàn bộ 5 message (3 cũ + 2 mới) dồn về conversation đích
    $msgCount = DB::table('messages')
        ->where('conversation_id', $newConv)
        ->count();
    expect($msgCount)->toBe(5);

    // Conversation cũ đã soft-delete và không còn message
    $oldDeleted = DB::table('conversations')
        ->where('id', $oldConv)
        ->whereNotNull('deleted_at')
        ->exists();
    expect($oldDeleted)->toBeTrue();

    $oldMsgs = DB::table('messages')
        ->where('conversation_id', $oldConv)
        ->count();
    expect($oldMsgs)->toBe(0);
})->group('channel-zalo');
