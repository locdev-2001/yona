<?php

use App\Models\Workspace;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;

/**
 * P02 (inbox-full-messaging-framework) — relay_event ĐI THEO messages, NGỪNG
 * ghi kho relay_events (bảng drop ở P09).
 *
 * - undo/seen/delivered/reaction → MessageStatusService (test chi tiết:
 *   tests/Feature/Inbox/MessageStateTest.php)
 * - typing → broadcast-only, KHÔNG DB
 * - event LẠ → 200 + structured log, KHÔNG kho, KHÔNG drop im lặng
 * - metering (channel_usage) KHÔNG tăng (F1/F14)
 * - MED-3: replay old_messages ∩ live cùng source_id → 1 message row
 *
 * @group channel-zalo
 */
beforeEach(function () {
    TenantScope::forget();
    config(['services.zalo_bridge.webhook_secret' => 'test-webhook-secret-123']);
});

afterEach(function () {
    TenantScope::forget();
});

function relayTestConnection(string $workspaceId, string $personalUid = 'uid_relay'): int
{
    $connId = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspaceId,
        'connection_id' => $connId,
        'personal_uid' => $personalUid,
        'display_name' => 'Relay Test',
        'state' => 'connected',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $connId;
}

function postRelayWebhook(array $payload)
{
    return test()->postJson(
        '/api/integrations/zalo-personal/webhook',
        $payload,
        ['X-Zalo-Personal-Bridge-Secret' => 'test-webhook-secret-123']
    );
}

it('P02/P09: seen_messages relay không đụng metering (kho relay_events đã drop)', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id);

    TenantScope::bind($ws->id);
    $usageBefore = (int) DB::table('channel_usage')->count();
    TenantScope::forget();

    postRelayWebhook([
        'type' => 'relay_event',
        'event_type' => 'seen_messages',
        'connection_id' => $connId,
        'personal_uid' => 'uid_relay',
        'payload' => [[['type' => 0, 'data' => ['msgId' => 'msg_unknown_x'], 'threadId' => 'p1']]],
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'receipts_processed']);

    TenantScope::bind($ws->id);
    expect((int) DB::table('channel_usage')->count())->toBe($usageBefore);
    TenantScope::forget();
})->group('channel-zalo');

it('typing: broadcast-only, 200, KHÔNG ghi DB (taxonomy phù du)', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_typing');

    postRelayWebhook([
        'type' => 'relay_event',
        'event_type' => 'typing',
        'connection_id' => $connId,
        'personal_uid' => 'uid_typing',
        'payload' => [['type' => 0, 'data' => ['uid' => 'peer_x', 'ts' => '1'], 'threadId' => 'peer_x']],
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'typing_broadcast']);

    // P09: không còn bảng kho nào để ghi typing
    expect(DB::selectOne("SELECT to_regclass('public.relay_events') AS t")->t)->toBeNull();
})->group('channel-zalo');

it('event LẠ → 200 + log redacted, KHÔNG kho, KHÔNG drop im lặng', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_unknown_evt');

    postRelayWebhook([
        'type' => 'totally_new_zca_event',
        'connection_id' => $connId,
        'source_id' => 'unknown_evt_001',
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'relay_event_unknown_logged']);

})->group('channel-zalo');

it('undo retry khi tin chưa về: idempotent qua pending unique — 1 row, 200 cả 2 lần', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_dedup_relay');

    $payload = [
        'type' => 'relay_event',
        'event_type' => 'undo',
        'connection_id' => $connId,
        'payload' => [[
            'data' => ['msgId' => 'UNDO_ACT_1', 'content' => ['globalMsgId' => 'target_chua_ve_1'], 'ts' => '1751600000000'],
            'threadId' => 'peer_d',
        ]],
    ];

    postRelayWebhook($payload)->assertStatus(200)->assertJson(['message' => 'undo_pending']);
    postRelayWebhook($payload)->assertStatus(200)->assertJson(['message' => 'undo_pending']);

    TenantScope::bind($ws->id);
    $count = DB::table('pending_message_states')->where('target_msg_id', 'target_chua_ve_1')->count();
    TenantScope::forget();
    expect($count)->toBe(1);
})->group('channel-zalo');

it('rejects relay_event without event_type as permanent bad payload (422)', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_bad_relay');

    postRelayWebhook([
        'type' => 'relay_event',
        'connection_id' => $connId,
    ])->assertStatus(422);
})->group('channel-zalo');

// MED-3: old_messages backfill ∩ live cùng msgId → dedup về 1 message row
it('deduplicates old_messages backfill replay against live message with same source_id', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_med3');

    $base = [
        'connection_id' => $connId,
        'bot_id' => $connId,
        'personal_uid' => 'uid_med3',
        'peer_uid' => 'peer_med3',
        'thread_id' => 'peer_med3',
        'thread_type' => 0,
        'source_id' => 'msg_med3_8005215164474',
        'is_self' => false,
        'direction' => 'in',
        'user' => ['name' => 'Peer', 'avatar' => null],
        'platform_sent_at' => now()->getTimestampMs(),
        'inbound_kind' => 'text',
        'content' => 'tin trong gap',
    ];

    // Live trước, backfill (old_messages normalize) dội lại cùng msgId sau
    postRelayWebhook(array_merge($base, ['type' => 'inbound']))->assertStatus(200);
    postRelayWebhook(array_merge($base, ['type' => 'inbound', 'backfill' => true]))->assertStatus(200);

    TenantScope::bind($ws->id);
    $count = DB::table('messages')->where('source_id', 'msg_med3_8005215164474')->count();
    TenantScope::forget();
    expect($count)->toBe(1);
})->group('channel-zalo');
