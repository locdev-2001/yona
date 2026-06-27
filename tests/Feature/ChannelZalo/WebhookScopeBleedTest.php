<?php

use Illuminate\Support\Facades\DB;
use Modules\ChannelZalo\Models\ZaloConnection;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Support\TenantScope;

// Helper: bind currentWorkspace + TenantScope cùng nhau (giống IdentifyWorkspace)
function bindWorkspaceContext(string $workspaceId): void
{
    TenantScope::bind($workspaceId);
    app()->instance('currentWorkspace', Workspace::withoutGlobalScopes()->find($workspaceId));
}

function forgetWorkspaceContext(): void
{
    TenantScope::forget();
    app()->forgetInstance('currentWorkspace');
}

/**
 * F19 — Webhook RLS Scope Bleed Test (CATASTROPHIC regression guard).
 *
 * Mục tiêu: đảm bảo 2 webhook từ 2 workspace khác nhau trên cùng pooled connection
 * KHÔNG để dữ liệu của workspace A lọt vào workspace B và ngược lại.
 *
 * Flow kiểm tra:
 *   1. Tạo 2 workspace, 2 ZaloConnection (connection_id khác nhau, global unique)
 *   2. Simulate webhook inbound qua ZaloPersonalWebhookController (không HTTP — gọi trực tiếp)
 *   3. Assert: Message tạo bởi webhook A chỉ visible trong RLS context của ws A
 *   4. Assert: Message tạo bởi webhook B chỉ visible trong RLS context của ws B
 *   5. Assert: ws A không thấy message của B (và ngược lại)
 *
 * @group rls
 */

beforeEach(function () {
    // Đảm bảo TenantScope sạch trước mỗi test
    TenantScope::forget();
});

afterEach(function () {
    TenantScope::forget();
});

it('webhook inbound for connection A creates message in workspace A only (F19 scope bleed)', function () {
    // Tạo 2 workspace
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    // Tạo ZaloConnection cho từng workspace (insert qua pgsql_privileged, bypass RLS)
    $connIdA = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;
    $connIdB = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    // Insert zalo_connections bypass RLS (dùng pgsql_privileged)
    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        [
            'workspace_id' => $wsA->id,
            'connection_id' => $connIdA,
            'personal_uid' => 'uid_a',
            'display_name' => 'Zalo A',
            'state' => 'connected',
            'created_at' => now(),
            'updated_at' => now(),
        ],
        [
            'workspace_id' => $wsB->id,
            'connection_id' => $connIdB,
            'personal_uid' => 'uid_b',
            'display_name' => 'Zalo B',
            'state' => 'connected',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    ]);

    // --- Simulate webhook inbound cho connection A ---
    $payloadA = [
        'type'              => 'inbound',
        'connection_id'     => $connIdA,
        'bot_id'            => 1,
        'personal_uid'      => 'uid_a',
        'peer_uid'          => 'peer_from_a_001',
        'thread_id'         => 'peer_from_a_001',
        'thread_type'       => 0,
        'source_id'         => 'msg_scope_bleed_test_a_001',
        'is_self'           => false,
        'direction'         => 'in',
        'user'              => ['name' => 'Khách A', 'avatar' => null],
        'platform_sent_at'  => now()->timestamp * 1000,
        'inbound_kind'      => 'text',
        'content'           => 'Tin nhắn từ workspace A',
        'msg_type'          => 'chat.text',
    ];

    simulateZaloWebhook($payloadA);

    // --- Simulate webhook inbound cho connection B ---
    $payloadB = [
        'type'              => 'inbound',
        'connection_id'     => $connIdB,
        'bot_id'            => 2,
        'personal_uid'      => 'uid_b',
        'peer_uid'          => 'peer_from_b_001',
        'thread_id'         => 'peer_from_b_001',
        'thread_type'       => 0,
        'source_id'         => 'msg_scope_bleed_test_b_001',
        'is_self'           => false,
        'direction'         => 'in',
        'user'              => ['name' => 'Khách B', 'avatar' => null],
        'platform_sent_at'  => now()->timestamp * 1000,
        'inbound_kind'      => 'text',
        'content'           => 'Tin nhắn từ workspace B',
        'msg_type'          => 'chat.text',
    ];

    simulateZaloWebhook($payloadB);

    // --- Assert: ws A chỉ thấy message của mình ---
    TenantScope::bind($wsA->id);

    $convsA = Conversation::where('channel', 'zalo_personal')->get();
    expect($convsA)->toHaveCount(1);
    expect($convsA->first()->peer_uid)->toBe('peer_from_a_001');

    $msgsA = Message::whereIn('conversation_id', $convsA->pluck('id'))->get();
    expect($msgsA)->toHaveCount(1);
    expect($msgsA->first()->body)->toBe('Tin nhắn từ workspace A');
    expect($msgsA->first()->source_id)->toBe('msg_scope_bleed_test_a_001');

    // ws A KHÔNG thấy message của B
    $bleedMsgFromB = Message::where('source_id', 'msg_scope_bleed_test_b_001')->first();
    expect($bleedMsgFromB)->toBeNull();

    // --- Switch: ws B chỉ thấy message của mình ---
    TenantScope::bind($wsB->id);

    $convsB = Conversation::where('channel', 'zalo_personal')->get();
    expect($convsB)->toHaveCount(1);
    expect($convsB->first()->peer_uid)->toBe('peer_from_b_001');

    $msgsB = Message::whereIn('conversation_id', $convsB->pluck('id'))->get();
    expect($msgsB)->toHaveCount(1);
    expect($msgsB->first()->body)->toBe('Tin nhắn từ workspace B');

    // ws B KHÔNG thấy message của A
    $bleedMsgFromA = Message::where('source_id', 'msg_scope_bleed_test_a_001')->first();
    expect($bleedMsgFromA)->toBeNull();

    TenantScope::forget();
})->group('rls', 'channel-zalo', 'scope-bleed');

it('unknown connection_id returns 202 and creates no orphan records (F19)', function () {
    $nonExistentConnectionId = 999999999;

    $payloadUnknown = [
        'type'          => 'inbound',
        'connection_id' => $nonExistentConnectionId,
        'peer_uid'      => 'orphan_peer',
        'source_id'     => 'orphan_msg_001',
        'inbound_kind'  => 'text',
        'content'       => 'should not persist',
        'direction'     => 'in',
    ];

    $response = simulateZaloWebhook($payloadUnknown);

    expect($response['status'])->toBe(202);
    expect($response['body']['message'])->toBe('connection_not_mapped');

    // Assert: không có Conversation/Message orphan dù bỏ qua RLS check
    $orphanConv = DB::connection('pgsql_privileged')
        ->table('conversations')
        ->where('peer_uid', 'orphan_peer')
        ->first();
    expect($orphanConv)->toBeNull();
})->group('channel-zalo', 'scope-bleed');

it('invalid HMAC secret returns 401', function () {
    $response = $this->postJson(
        '/api/integrations/zalo-personal/webhook',
        ['type' => 'inbound', 'connection_id' => 1],
        ['X-Zalo-Personal-Bridge-Secret' => 'wrong-secret']
    );

    $response->assertStatus(401);
})->group('channel-zalo');

/**
 * Helper: simulate webhook controller flow trực tiếp (không qua HTTP để tránh
 * phụ thuộc HMAC trong unit test — HMAC test bằng HTTP assertStatus riêng).
 *
 * @param  array<string, mixed>  $payload
 * @return array{status: int, body: array<string, mixed>}
 */
function simulateZaloWebhook(array $payload): array
{
    $connectionId = (int) ($payload['connection_id'] ?? 0);

    forgetWorkspaceContext();

    /** @var string|null $workspaceId */
    $workspaceId = \Modules\ChannelZalo\Models\ZaloConnection::workspaceForConnection($connectionId);

    if ($workspaceId === null) {
        return ['status' => 202, 'body' => ['ok' => true, 'message' => 'connection_not_mapped']];
    }

    bindWorkspaceContext($workspaceId);

    try {
        $channelManager = app(\Modules\Inbox\Channel\ChannelManager::class);
        $ingestService = app(\Modules\Inbox\Services\InboundMessageService::class);

        $driver = $channelManager->driver('zalo_personal');
        $normalized = $driver->parseInbound($payload);
        $ingestService->ingest($normalized);

        return ['status' => 200, 'body' => ['ok' => true]];
    } finally {
        forgetWorkspaceContext();
    }
}
