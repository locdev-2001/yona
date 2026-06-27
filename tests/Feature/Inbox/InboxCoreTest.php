<?php

use Illuminate\Support\Facades\DB;
use Modules\Identity\Models\User;
use Modules\Inbox\Channel\AllowAllMeteringGate;
use Modules\Inbox\Channel\ChannelManager;
use Modules\Inbox\Contracts\MeteringGate;
use Modules\Inbox\Models\Conversation;
use Modules\Inbox\Models\Message;
use Modules\Tenancy\Models\WorkspaceSequence;
use Modules\Tenancy\Models\Workspace;

// ── CRUD: Conversation + Message ─────────────────────────────────────────────

it('creates a conversation and message in the same workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_uid_001',
        'thread_type' => 0,
        'peer_name' => 'Khách test',
        'contact_id' => null, // F23: Liên hệ nháp
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $msg = Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conv->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'Xin chào!',
        'source_id' => 'zalo_msg_001',
        'platform_sent_at' => now(),
    ]);

    expect($conv->id)->toBeString()
        ->and($conv->contact_id)->toBeNull()  // F23: Liên hệ nháp
        ->and($msg->conversation_id)->toBe($conv->id)
        ->and($msg->direction)->toBe('in');
});

// ── RLS isolation: 2-workspace ────────────────────────────────────────────────

it('conversation from workspace A is not visible in workspace B query (RLS)', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($ws1, $user1);
    seedMember($ws1, $user1, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $ws1->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_secret_uid',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws1->id),
    ]);

    // Switch to WS-2
    actingInWorkspace($ws2, $user2);
    seedMember($ws2, $user2, 'admin');

    $found = Conversation::where('id', $conv->id)->first();
    expect($found)->toBeNull();
});

it('message from workspace A is not visible in workspace B (RLS)', function () {
    $ws1 = Workspace::factory()->create();
    $ws2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    actingInWorkspace($ws1, $user1);
    seedMember($ws1, $user1, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $ws1->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'uid_ws1_only',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws1->id),
    ]);

    $msg = Message::create([
        'workspace_id' => $ws1->id,
        'conversation_id' => $conv->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'secret message ws1',
        'source_id' => 'src_ws1_001',
        'platform_sent_at' => now(),
    ]);

    // Switch to WS-2
    actingInWorkspace($ws2, $user2);
    seedMember($ws2, $user2, 'admin');

    $found = Message::where('id', $msg->id)->first();
    expect($found)->toBeNull();
});

// ── Unique(zalo_connection_id, peer_uid) idempotent upsert ───────────────────

it('conversations unique(zalo_connection_id, peer_uid) enforces idempotency', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);
    seedMember($ws, $user, 'admin');

    // zalo_connection_id là bigint sau migration 700004
    $connectionId = random_int(1_000_000, 9_999_999);

    Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $connectionId,
        'peer_uid' => 'peer_abc',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    // Thử insert lại cùng (zalo_connection_id, peer_uid) → phải throw
    expect(fn () => Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $connectionId,
        'peer_uid' => 'peer_abc',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]))->toThrow(\Illuminate\Database\QueryException::class);
});

// ── Soft-delete global scope ──────────────────────────────────────────────────

it('soft-deleted conversation is hidden by global scope', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);
    seedMember($ws, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_soft_delete',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    $conv->delete(); // soft delete

    $found = Conversation::where('id', $conv->id)->first();
    expect($found)->toBeNull();

    // withTrashed() vẫn tìm được
    $trashed = Conversation::withTrashed()->where('id', $conv->id)->first();
    expect($trashed)->not->toBeNull()
        ->and($trashed->deleted_at)->not->toBeNull();
});

// ── MeteringGate no-op default ───────────────────────────────────────────────

it('MeteringGate default binding is AllowAllMeteringGate (no-op)', function () {
    $gate = app(MeteringGate::class);

    expect(get_class($gate))->toBe(AllowAllMeteringGate::class);
});

it('AllowAllMeteringGate canStartNew always returns true (disable-safe)', function () {
    $gate = app(MeteringGate::class);

    expect($gate->canStartNew('zalo_personal'))->toBeTrue()
        ->and($gate->canStartNew('messenger'))->toBeTrue();
});

it('AllowAllMeteringGate canReplyOnExisting always returns true', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $conv = Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_meter_test',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    $gate = app(MeteringGate::class);
    expect($gate->canReplyOnExisting($conv))->toBeTrue();
});

it('AllowAllMeteringGate meterReply is a no-op (no exception, no DB write)', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);

    $conv = Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_noop_meter',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    $periodBefore = $conv->last_metered_period;

    $gate = app(MeteringGate::class);
    $gate->meterReply($conv); // no-op → không throw, không update DB

    $conv->refresh();
    expect($conv->last_metered_period)->toBe($periodBefore); // unchanged
});

// ── ChannelManager ────────────────────────────────────────────────────────────

it('ChannelManager singleton resolves from container', function () {
    $manager = app(ChannelManager::class);
    expect($manager)->toBeInstanceOf(ChannelManager::class);
});

it('ChannelManager hasAny returns true when zalo_personal driver is registered (channel-zalo module)', function () {
    // channel-zalo ServiceProvider đã register 'zalo_personal' driver khi boot
    $manager = app(ChannelManager::class);
    expect($manager->hasAny())->toBeTrue();
    expect($manager->driver('zalo_personal'))->toBeInstanceOf(\Modules\ChannelZalo\Services\ZaloChannelDriver::class);
});

it('ChannelManager hasAny returns true after driver registered', function () {
    $manager = app(ChannelManager::class);

    $manager->extend('test_channel', function () {
        return new class implements \Modules\Inbox\Contracts\ChannelDriver {
            public function channelKey(): string { return 'test_channel'; }
            public function connect(string $workspaceId, array $params): void {}
            public function disconnect(string $workspaceId): void {}
            public function sendMessage(\Modules\Inbox\Models\Conversation $c, array $p): void {}
            public function parseInbound(array $raw): array { return []; }
        };
    });

    expect($manager->hasAny())->toBeTrue();
});
