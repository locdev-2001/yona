<?php

use Illuminate\Support\Facades\DB;
use Modules\ChannelZalo\Models\ZaloConnection;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Support\TenantScope;

/**
 * Webhook contract tests cho channel-zalo.
 *
 * - inbound → Conversation + Message tạo (idempotent)
 * - bridge_session → ZaloConnection.state cập nhật
 * - HMAC sai → 401
 * - connection_id lạ → 202 (no orphan)
 *
 * @group channel-zalo
 */

beforeEach(function () {
    TenantScope::forget();
    // Cấu hình webhook secret cho test (mock)
    config(['services.zalo_bridge.webhook_secret' => 'test-webhook-secret-123']);
});

afterEach(function () {
    TenantScope::forget();
});

// ── HMAC ─────────────────────────────────────────────────────────────────────

it('returns 401 when HMAC secret is missing', function () {
    $this->postJson('/api/integrations/zalo-personal/webhook', ['type' => 'inbound'])
        ->assertStatus(401);
})->group('channel-zalo');

it('returns 401 when HMAC secret is wrong', function () {
    $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        ['type' => 'inbound', 'connection_id' => 1],
        ['X-Zalo-Personal-Bridge-Secret' => 'wrong-secret']
    )->assertStatus(401);
})->group('channel-zalo');

// ── Unknown connection_id ─────────────────────────────────────────────────────

it('returns 202 and creates no orphan when connection_id not mapped', function () {
    $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        [
            'type'          => 'inbound',
            'connection_id' => 888888888,
            'peer_uid'      => 'ghost_peer',
            'source_id'     => 'ghost_msg_001',
            'inbound_kind'  => 'text',
            'content'       => 'should not save',
            'direction'     => 'in',
        ],
        ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']
    )->assertStatus(202);

    // Không có conversation/message orphan
    $orphan = DB::connection('pgsql_privileged')
        ->table('conversations')
        ->where('peer_uid', 'ghost_peer')
        ->first();
    expect($orphan)->toBeNull();
})->group('channel-zalo');

// ── Inbound → Conversation + Message ─────────────────────────────────────────

it('inbound webhook creates conversation and message', function () {
    $ws = Workspace::factory()->create();
    $connId = createZaloConnection($ws->id);

    $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        [
            'type'              => 'inbound',
            'connection_id'     => $connId,
            'bot_id'            => 1,
            'personal_uid'      => 'uid_test',
            'peer_uid'          => 'peer_contract_001',
            'thread_id'         => 'peer_contract_001',
            'thread_type'       => 0,
            'source_id'         => 'src_contract_inbound_001',
            'is_self'           => false,
            'direction'         => 'in',
            'user'              => ['name' => 'Khách Test', 'avatar' => null],
            'platform_sent_at'  => now()->timestamp * 1000,
            'inbound_kind'      => 'text',
            'content'           => 'Xin chào hệ thống',
        ],
        ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']
    )->assertStatus(200);

    // Verify: Conversation tồn tại trong ws
    TenantScope::bind($ws->id);

    $conv = Conversation::where('peer_uid', 'peer_contract_001')->first();
    expect($conv)->not->toBeNull();
    expect($conv->contact_id)->toBeNull(); // F23: Liên hệ nháp
    expect($conv->channel)->toBe('zalo_personal');

    $msg = Message::where('source_id', 'src_contract_inbound_001')->first();
    expect($msg)->not->toBeNull();
    expect($msg->direction)->toBe('in');
    expect($msg->body)->toBe('Xin chào hệ thống');

    TenantScope::forget();
})->group('channel-zalo');

it('inbound webhook is idempotent — duplicate source_id does not double-insert', function () {
    $ws = Workspace::factory()->create();
    $connId = createZaloConnection($ws->id, 'uid_dedup');

    $payload = [
        'type'             => 'inbound',
        'connection_id'    => $connId,
        'peer_uid'         => 'peer_dedup_001',
        'source_id'        => 'src_dedup_001',
        'is_self'          => false,
        'direction'        => 'in',
        'user'             => ['name' => 'Khách Dedup', 'avatar' => null],
        'platform_sent_at' => now()->timestamp * 1000,
        'inbound_kind'     => 'text',
        'content'          => 'Tin nhắn lần 1',
    ];

    $headers = ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123'];

    $this->postJson('/api/integrations/zalo-personal/webhook', $payload, $headers)
        ->assertStatus(200);
    $this->postJson('/api/integrations/zalo-personal/webhook', $payload, $headers)
        ->assertStatus(200); // idempotent — 200 chứ không 409

    TenantScope::bind($ws->id);
    $msgCount = Message::where('source_id', 'src_dedup_001')->count();
    expect($msgCount)->toBe(1); // chỉ 1 message

    TenantScope::forget();
})->group('channel-zalo');

// ── bridge_session → ZaloConnection.state ────────────────────────────────────

it('bridge_session event updates ZaloConnection state to connected', function () {
    $ws = Workspace::factory()->create();
    $connId = createZaloConnection($ws->id, 'uid_session_test', 'disconnected');

    $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        [
            'type'          => 'bridge_session',
            'connection_id' => $connId,
            'bot_id'        => 1,
            'state'         => 'session_ok',
            'detail'        => null,
        ],
        ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']
    )->assertStatus(200);

    TenantScope::bind($ws->id);
    $conn = ZaloConnection::where('connection_id', $connId)->first();
    expect($conn->state)->toBe('connected');
    TenantScope::forget();
})->group('channel-zalo');

it('bridge_session event updates state to session_lost with reason', function () {
    $ws = Workspace::factory()->create();
    $connId = createZaloConnection($ws->id, 'uid_lost_test', 'connected');

    $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        [
            'type'          => 'bridge_session',
            'connection_id' => $connId,
            'bot_id'        => 1,
            'state'         => 'session_lost',
            'detail'        => 'ws_closed_3000_',
        ],
        ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']
    )->assertStatus(200);

    TenantScope::bind($ws->id);
    $conn = ZaloConnection::where('connection_id', $connId)->first();
    expect($conn->state)->toBe('session_lost');
    expect($conn->session_lost_reason)->toBe('ws_closed_3000_');
    TenantScope::forget();
})->group('channel-zalo');

// ── ChannelManager driver registration ───────────────────────────────────────

it('ChannelManager has zalo_personal driver registered', function () {
    $manager = app(\Modules\Inbox\Channel\ChannelManager::class);
    expect($manager->hasAny())->toBeTrue();

    $driver = $manager->driver('zalo_personal');
    expect($driver)->toBeInstanceOf(\Modules\ChannelZalo\Services\ZaloChannelDriver::class);
    expect($driver->channelKey())->toBe('zalo_personal');
})->group('channel-zalo');

// ── connection_id sequence cross-tenant ──────────────────────────────────────

it('connection_id sequence produces unique global IDs across workspaces', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $idA = createZaloConnection($wsA->id, 'uid_seq_a');
    $idB = createZaloConnection($wsB->id, 'uid_seq_b');

    // connection_id toàn cục — khác nhau
    expect($idA)->not->toBe($idB);

    // Verify unique constraint
    $counts = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
        ->whereIn('connection_id', [$idA, $idB])
        ->count();
    expect($counts)->toBe(2);
})->group('channel-zalo');

// ── RLS policy exists ─────────────────────────────────────────────────────────

it('zalo_connections table has ws_isolation RLS policy', function () {
    $result = DB::selectOne("
        SELECT COUNT(*) as cnt FROM pg_policies
        WHERE tablename = 'zalo_connections' AND policyname = 'ws_isolation'
    ");
    expect((int) ($result->cnt ?? 0))->toBeGreaterThanOrEqual(1);
})->group('rls', 'channel-zalo');

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Tạo ZaloConnection cho workspace (bypass RLS qua pgsql_privileged).
 */
function createZaloConnection(string $workspaceId, string $personalUid = 'uid_test', string $state = 'connected'): int
{
    $connId = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id'  => $workspaceId,
        'connection_id' => $connId,
        'personal_uid'  => $personalUid,
        'display_name'  => 'Test Zalo',
        'state'         => $state,
        'created_at'    => now(),
        'updated_at'    => now(),
    ]);

    return $connId;
}
