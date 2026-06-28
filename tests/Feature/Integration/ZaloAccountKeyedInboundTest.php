<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Workspace;
use App\Services\InboundMessageService;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Account-keyed inbound: cùng tài khoản Zalo (personal_uid) + cùng peer KHÔNG fork
 * thành conversation mới khi reconnect đổi connection_id.
 *
 * @group channel-zalo
 */
beforeEach(function () {
    TenantScope::forget();
});

afterEach(function () {
    TenantScope::forget();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert zalo_connection qua pgsql_privileged (no FK). Trả về connection_id (bigint).
 */
function makeConnection(string $workspaceId, ?string $personalUid, string $state = 'connected', bool $trashed = false): int
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
        'deleted_at' => $trashed ? now() : null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $connId;
}

/**
 * Insert conversation + 1 message qua default connection (RLS-bound, transacted).
 * Trả về conversation id (uuid).
 */
function makeConversationWithMessage(string $workspaceId, int $connectionId, string $peerUid, string $sourceId): string
{
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

    DB::table('messages')->insert([
        'id' => (string) Str::uuid(),
        'workspace_id' => $workspaceId,
        'conversation_id' => $convId,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'tin cũ',
        'source_id' => $sourceId,
        'platform_sent_at' => now()->subMinute(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $convId;
}

function bindWs(string $workspaceId): void
{
    TenantScope::bind($workspaceId);
    app()->instance('currentWorkspace', Workspace::withoutGlobalScopes()->find($workspaceId));
}

// ── Test 1: reconnect không fork — message vào conversation canonical ─────────

it('account-keyed inbound lands in the existing conversation across reconnect — no fork', function () {
    $ws = Workspace::factory()->create();
    $peer = 'peer_em_be';
    $uid = 'uid_account';

    // cid A: connection mới (connected). cid B: connection cũ (soft-deleted) cùng personal_uid.
    $cidB = makeConnection($ws->id, $uid, 'disconnected', trashed: true);
    $cidA = makeConnection($ws->id, $uid, 'connected');

    // Conversation hiện hữu nằm dưới connection CŨ (cid B)
    bindWs($ws->id);
    $existingConv = makeConversationWithMessage($ws->id, $cidB, $peer, 'old_msg_1');

    // Ingest inbound mới: connection_id=A (mới) nhưng cùng personal_uid + cùng peer
    app(InboundMessageService::class)->ingest([
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $cidA,
        'connection_personal_uid' => $uid,
        'peer_uid' => $peer,
        'peer_name' => 'Em Bé',
        'direction' => 'in',
        'source_id' => 'new_msg_1',
        'type' => 'text',
        'body' => 'tin mới sau reconnect',
        'platform_sent_at' => now()->toDateTimeString(),
    ]);

    // KHÔNG tạo conversation mới — chỉ 1 conversation cho peer này
    $convCount = Conversation::where('peer_uid', $peer)->count();
    expect($convCount)->toBe(1);

    // Message mới rơi vào conversation hiện hữu (dưới cid B)
    $conv = Conversation::where('peer_uid', $peer)->first();
    expect($conv->id)->toBe($existingConv);
    expect((int) $conv->zalo_connection_id)->toBe($cidB); // không bị đổi sang A

    $msgCount = Message::where('conversation_id', $existingConv)->count();
    expect($msgCount)->toBe(2); // old_msg_1 + new_msg_1

    TenantScope::forget();
})->group('channel-zalo');

// ── Test 2: pending connection (uid null) → fallback connection_id keying ─────

it('pending connection with null personal_uid falls back to connection_id keying', function () {
    $ws = Workspace::factory()->create();
    $peer = 'peer_pending';

    // Connection pending: chưa có personal_uid (qr_waiting)
    $cid = makeConnection($ws->id, null, 'qr_waiting');

    bindWs($ws->id);

    app(InboundMessageService::class)->ingest([
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $cid,
        'connection_personal_uid' => null,
        'peer_uid' => $peer,
        'direction' => 'in',
        'source_id' => 'pending_msg_1',
        'type' => 'text',
        'body' => 'tin từ connection pending',
        'platform_sent_at' => now()->toDateTimeString(),
    ]);

    // Tạo conversation mới dưới connection_id này (fallback keying)
    $conv = Conversation::where('peer_uid', $peer)->first();
    expect($conv)->not->toBeNull();
    expect((int) $conv->zalo_connection_id)->toBe($cid);

    expect(Conversation::where('peer_uid', $peer)->count())->toBe(1);

    TenantScope::forget();
})->group('channel-zalo');
