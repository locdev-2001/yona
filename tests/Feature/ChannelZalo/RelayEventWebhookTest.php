<?php

use App\Models\Workspace;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;

/**
 * P10 (inbox-multichannel-relayer) — relay_events store.
 *
 * - event type LẠ / relay_event → row relay_events, KHÔNG drop im lặng (H1)
 * - idempotent theo (workspace_id, event_type, source_id)
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

it('stores relay_event envelope into relay_events and does not touch metering', function () {
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
        'source_id' => 'relay_seen_001',
        'payload' => [['msgId' => '123', 'seen' => true]],
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'relay_event_stored']);

    TenantScope::bind($ws->id);
    $row = DB::table('relay_events')->where('source_id', 'relay_seen_001')->first();
    expect($row)->not->toBeNull()
        ->and($row->event_type)->toBe('seen_messages')
        ->and($row->workspace_id)->toBe($ws->id)
        ->and((int) $row->connection_id)->toBe($connId);

    $usageAfter = (int) DB::table('channel_usage')->count();
    TenantScope::forget();
    expect($usageAfter)->toBe($usageBefore);
})->group('channel-zalo');

it('does NOT store typing events — ephemeral presence, accepted with 200 so bridge never retries', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_typing');

    postRelayWebhook([
        'type' => 'relay_event',
        'event_type' => 'typing',
        'connection_id' => $connId,
        'personal_uid' => 'uid_typing',
        'payload' => [['threadId' => 'peer_x']],
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'relay_event_ephemeral_skipped']);

    TenantScope::bind($ws->id);
    $count = DB::table('relay_events')->where('event_type', 'typing')->count();
    TenantScope::forget();
    expect($count)->toBe(0);
})->group('channel-zalo');

it('stores unknown event type into relay_events instead of silently dropping (H1)', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_unknown_evt');

    postRelayWebhook([
        'type' => 'totally_new_zca_event',
        'connection_id' => $connId,
        'source_id' => 'unknown_evt_001',
    ])->assertStatus(200)->assertJson(['ok' => true, 'message' => 'relay_event_stored']);

    TenantScope::bind($ws->id);
    $row = DB::table('relay_events')->where('source_id', 'unknown_evt_001')->first();
    TenantScope::forget();
    expect($row)->not->toBeNull()
        ->and($row->event_type)->toBe('totally_new_zca_event');
})->group('channel-zalo');

it('deduplicates relay_event retries by source_id (idempotent, 200)', function () {
    $ws = Workspace::factory()->create();
    $connId = relayTestConnection($ws->id, 'uid_dedup_relay');

    $payload = [
        'type' => 'relay_event',
        'event_type' => 'undo',
        'connection_id' => $connId,
        'source_id' => 'undo_dup_001',
        'payload' => ['msgId' => 'undo_dup_001'],
    ];

    postRelayWebhook($payload)->assertStatus(200);
    postRelayWebhook($payload)->assertStatus(200)->assertJson(['message' => 'relay_event_duplicate']);

    TenantScope::bind($ws->id);
    $count = DB::table('relay_events')->where('source_id', 'undo_dup_001')->count();
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
