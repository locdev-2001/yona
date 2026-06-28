<?php

use App\Models\User;
use App\Models\Workspace;
use App\Services\ZaloGroupBackfillService;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Tests cho ZaloGroupBackfillService + POST /inbox/resync + auto-backfill on reconnect.
 *
 * @group channel-zalo
 */
beforeEach(function () {
    TenantScope::forget();
    config([
        'services.zalo_bridge.url' => 'http://bridge.test',
        'services.zalo_bridge.ui_secret' => 'test-ui-secret',
        'services.zalo_bridge.webhook_secret' => 'test-webhook-secret-123',
        'integrations.zalo_personal.enabled' => true,
    ]);
});

afterEach(function () {
    TenantScope::forget();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert ZaloConnection qua pgsql_privileged (bypass RLS + sequence).
 */
function insertZaloSlot(string $workspaceId, string $state = 'connected', ?string $lastSessionLostAt = null): int
{
    $connId = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspaceId,
        'connection_id' => $connId,
        'personal_uid' => 'uid_resync_' . $connId,
        'display_name' => 'Test Slot',
        'state' => $state,
        'last_session_lost_at' => $lastSessionLostAt,
        'deleted_at' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $connId;
}

/**
 * Insert conversation nhóm (thread_type=1) qua default connection (RLS session var đã set).
 * Phải gọi sau actingInWorkspace() / setWorkspaceContext().
 */
function insertGroupConversation(string $workspaceId, int $connId, string $peerUid): string
{
    $convId = (string) Str::uuid();
    DB::table('conversations')->insert([
        'id' => $convId,
        'workspace_id' => $workspaceId,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $connId,
        'peer_uid' => $peerUid,
        'thread_type' => 1,
        'peer_name' => 'Nhóm Test',
        'conversation_number' => random_int(1, 99999),
        'unread_count' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $convId;
}

/**
 * Insert conversation 1-1 (thread_type=0) qua default connection.
 */
function insertDmConversation(string $workspaceId, int $connId, string $peerUid): string
{
    $convId = (string) Str::uuid();
    DB::table('conversations')->insert([
        'id' => $convId,
        'workspace_id' => $workspaceId,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $connId,
        'peer_uid' => $peerUid,
        'thread_type' => 0,
        'peer_name' => 'Em Bé',
        'conversation_number' => random_int(1, 99999),
        'unread_count' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $convId;
}

// ── Test 1: Service gọi bridge đúng group_id, bỏ qua conv 1-1 ────────────────

it('ZaloGroupBackfillService calls bridge for group convs only, skips DM convs', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $connId = insertZaloSlot($ws->id);

    insertGroupConversation($ws->id, $connId, 'group_aaa');
    insertGroupConversation($ws->id, $connId, 'group_bbb');
    insertDmConversation($ws->id, $connId, 'dm_ccc'); // phải bị bỏ qua

    Http::fake([
        'http://bridge.test/backfill/group' => Http::response(['ok' => true, 'fetched' => 3], 200),
    ]);

    $fetched = app(ZaloGroupBackfillService::class)->run($connId);

    // 2 nhóm × 3 tin = 6
    expect($fetched)->toBe(6);

    Http::assertSentCount(2);
    Http::assertSent(function ($request) use ($connId) {
        $body = $request->data();

        return $request->url() === 'http://bridge.test/backfill/group'
            && $request->hasHeader('X-Bridge-UI-Secret', 'test-ui-secret')
            && $body['connection_id'] === $connId
            && in_array($body['group_id'], ['group_aaa', 'group_bbb']);
    });
})->group('channel-zalo');

// ── Test 2: Bridge lỗi → log + tiếp tục, không throw ────────────────────────

it('ZaloGroupBackfillService logs bridge errors and continues without throwing', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $connId = insertZaloSlot($ws->id);
    insertGroupConversation($ws->id, $connId, 'group_ok');
    insertGroupConversation($ws->id, $connId, 'group_err');

    Http::fake([
        'http://bridge.test/backfill/group' => Http::sequence()
            ->push(['ok' => true, 'fetched' => 5], 200)
            ->push(['ok' => false, 'message' => 'not_connected'], 409),
    ]);

    Log::spy();

    $fetched = app(ZaloGroupBackfillService::class)->run($connId);

    expect($fetched)->toBe(5); // chỉ nhóm đầu thành công
    Log::shouldHaveReceived('warning')->once();
})->group('channel-zalo');

// ── Test 3: Route POST /inbox/resync trả fetched tổng ────────────────────────

it('POST /inbox/resync returns total fetched from all connected connections', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $connId = insertZaloSlot($ws->id, 'connected');
    insertGroupConversation($ws->id, $connId, 'group_x');

    Http::fake([
        'http://bridge.test/backfill/group' => Http::response(['ok' => true, 'fetched' => 7], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->postJson('/inbox/resync')
        ->assertOk()
        ->assertJson(['ok' => true, 'fetched' => 7]);
})->group('channel-zalo');

// ── Test 4: bridge_session session_ok + hadGap → auto-backfill (mock service) ─
//
// Không E2E HTTP vì webhook request là separate connection — data trong
// DatabaseTransactions không visible cross-connection. Mock service để test
// logic "gọi run() khi hadGap=true" mà không cần data phải committed.

it('handleBridgeSession triggers ZaloGroupBackfillService when reconnecting after a gap', function () {
    $ws = Workspace::factory()->create();

    // Slot: state=session_lost, last_session_lost_at set → hadGap=true
    $connId = insertZaloSlot($ws->id, 'session_lost', now()->subHour()->toDateTimeString());

    $mockService = Mockery::mock(ZaloGroupBackfillService::class);
    $mockService->shouldReceive('run')->once()->with($connId)->andReturn(4);
    app()->instance(ZaloGroupBackfillService::class, $mockService);

    $this->postJson('/api/integrations/zalo-personal/webhook', [
        'type' => 'bridge_session',
        'connection_id' => $connId,
        'state' => 'session_ok',
    ], ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123'])->assertOk();

    // Mockery assertion: ->once() verifies run() was called
})->group('channel-zalo');

// ── Test 5: session_ok không có gap → KHÔNG backfill ─────────────────────────

it('handleBridgeSession skips backfill when no gap detected', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    // Slot chưa bao giờ mất session (last_session_lost_at null, state=connected)
    $connId = insertZaloSlot($ws->id, 'connected', null);
    insertGroupConversation($ws->id, $connId, 'group_nogap');

    Http::fake();

    $this->postJson('/api/integrations/zalo-personal/webhook', [
        'type' => 'bridge_session',
        'connection_id' => $connId,
        'state' => 'session_ok',
    ], ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']);

    Http::assertNothingSent();
})->group('channel-zalo');
