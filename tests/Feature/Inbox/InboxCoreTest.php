<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver;
use App\Modules\Integration\Contracts\ChannelCapabilities;
use App\Modules\Integration\Contracts\ChannelDriver;
use Illuminate\Database\QueryException;

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

// ── Mark read: POST inbox.read ────────────────────────────────────────────────

it('POST inbox.read đưa unread_count về 0 (idempotent)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'zalo_uid_read',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
    $conv->forceFill(['unread_count' => 5])->save();

    $this->postJson(route('inbox.read', $conv->id))->assertOk();
    expect($conv->fresh()->unread_count)->toBe(0);

    // Gọi lần 2 khi đã 0 — vẫn OK, không lỗi
    $this->postJson(route('inbox.read', $conv->id))->assertOk();
    expect($conv->fresh()->unread_count)->toBe(0);
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

// ── Unique(channel_account_id, peer_uid) idempotent upsert (P08 re-key) ──────

it('conversations unique(channel_account_id, peer_uid) enforces idempotency', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($ws, $user);
    seedMember($ws, $user, 'admin');

    $accountId = ChannelAccount::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_'.uniqid(),
        'status' => 'connected',
    ])->id;

    Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'peer_uid' => 'peer_abc',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]);

    // Thử insert lại cùng (channel_account_id, peer_uid) → phải throw
    expect(fn () => Conversation::create([
        'workspace_id' => $ws->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'peer_uid' => 'peer_abc',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $ws->id),
    ]))->toThrow(QueryException::class);
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

// ── ChannelManager ────────────────────────────────────────────────────────────

it('ChannelManager singleton resolves from container', function () {
    $manager = app(ChannelManager::class);
    expect($manager)->toBeInstanceOf(ChannelManager::class);
});

it('ChannelManager hasAny returns true when zalo_personal driver is registered (channel-zalo module)', function () {
    // channel-zalo ServiceProvider đã register 'zalo_personal' driver khi boot
    $manager = app(ChannelManager::class);
    expect($manager->hasAny())->toBeTrue();
    expect($manager->driver('zalo_personal'))->toBeInstanceOf(ZaloChannelDriver::class);
});

it('ChannelManager hasAny returns true after driver registered', function () {
    $manager = app(ChannelManager::class);

    $manager->extend('test_channel', function () {
        return new class implements ChannelDriver
        {
            public function channelKey(): string
            {
                return 'test_channel';
            }

            public function connect(string $workspaceId, array $params): void {}

            public function disconnect(string $workspaceId): void {}

            public function sendMessage(Conversation $c, array $p): Message
            {
                return new Message;
            }

            public function parseInbound(array $raw): array
            {
                return [];
            }

            public function capabilities(): ChannelCapabilities
            {
                return new ChannelCapabilities;
            }
        };
    });

    expect($manager->hasAny())->toBeTrue();
});
