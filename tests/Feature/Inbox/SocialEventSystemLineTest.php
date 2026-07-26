<?php

use App\Events\ConversationSystemLine;
use App\Models\Activity;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

/**
 * P08 — group_event/friend_event hết no-op → dòng hệ thống conversation_events
 * (taxonomy loại 3). Idempotent theo dedup_key (source_id envelope).
 */
beforeEach(function () {
    TenantScope::forget();
    config(['services.zalo_bridge.webhook_secret' => 'test-secret-social']);
});

afterEach(function () {
    TenantScope::forget();
});

/** Identity chain committed qua privileged (webhook resolve qua session khác). */
function seSetup(): array
{
    $priv = fn (string $table) => DB::connection('pgsql_privileged')->table($table);

    $wsId = (string) Str::uuid();
    $priv('workspaces')->insert([
        'id' => $wsId, 'name' => 'WS Social', 'slug' => 'ws-social-'.uniqid(),
        'base_currency' => 'VND', 'timezone' => 'Asia/Ho_Chi_Minh', 'locale' => 'vi',
        'audit_retention' => '1y', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $accountId = (string) Str::uuid();
    $priv('channel_accounts')->insert([
        'id' => $accountId, 'workspace_id' => $wsId, 'channel' => 'zalo_personal',
        'account_uid' => 'uid_se_'.uniqid(), 'status' => 'connected',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $connectionId = ZaloConnection::nextConnectionId();
    $priv('zalo_connections')->insert([
        'workspace_id' => $wsId, 'connection_id' => $connectionId,
        'channel_account_id' => $accountId, 'state' => 'connected',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $workspace = Workspace::withoutGlobalScopes()->find($wsId);
    app()->instance('currentWorkspace', $workspace);
    setWorkspaceContext($wsId);

    $conversation = Conversation::create([
        'workspace_id' => $wsId,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'sender_uid' => 'group_se_'.uniqid(),
        'thread_type' => 1,
        'conversation_number' => WorkspaceSequence::next('conversation', $wsId),
    ]);

    return [$workspace, $accountId, $conversation, $connectionId];
}

function sePostSocial(Workspace $workspace, int $connectionId, string $socialKind, string $threadId, array $event, string $sourceId)
{
    $response = test()->postJson(route('zalo.webhook'), [
        'type' => 'social_event',
        'social_kind' => $socialKind,
        'connection_id' => $connectionId,
        'thread_id' => $threadId,
        'event' => $event,
        'source_id' => $sourceId,
    ], ['X-Zalo-Personal-Bridge-Secret' => 'test-secret-social']);

    app()->instance('currentWorkspace', $workspace);
    setWorkspaceContext($workspace->id);

    return $response;
}

it('group_event update (đổi tên) → dòng group_system + label + bump stream_version; retry KHÔNG nhân đôi', function () {
    Event::fake([ConversationSystemLine::class]);
    [$workspace, , $conversation, $connectionId] = seSetup();
    $svBefore = (int) $conversation->fresh()->stream_version;

    $event = ['type' => 'update', 'act' => 'update', 'threadId' => $conversation->sender_uid, 'data' => ['groupName' => 'Team Bán Hàng']];

    sePostSocial($workspace, $connectionId, 'group_event', $conversation->sender_uid, $event, 'zps:se:rename1')
        ->assertOk()->assertJsonPath('message', 'social_event_materialized');

    // Retry cùng source_id → không nhân đôi
    sePostSocial($workspace, $connectionId, 'group_event', $conversation->sender_uid, $event, 'zps:se:rename1')->assertOk();

    $rows = DB::table('conversation_events')->where('conversation_id', $conversation->id)->where('kind', 'group_system')->get();
    expect($rows)->toHaveCount(1);
    $payload = json_decode((string) $rows[0]->payload, true);
    expect($payload['label'])->toContain('Team Bán Hàng')
        ->and((int) $conversation->fresh()->stream_version)->toBe($svBefore + 1);

    Event::assertDispatchedTimes(ConversationSystemLine::class, 1);
});

it('group_event act NGOÀI whitelist → 200, không row (không parse mù)', function () {
    [$workspace, , $conversation, $connectionId] = seSetup();

    sePostSocial($workspace, $connectionId, 'group_event', $conversation->sender_uid, [
        'type' => 'new_pin_topic', 'data' => [],
    ], 'zps:se:pin1')->assertOk()->assertJsonPath('message', 'social_event_ignored');

    expect(DB::table('conversation_events')->where('kind', 'group_system')->count())->toBe(0);
});

it('social_event cho thread CHƯA có conversation → 200 êm', function () {
    [$workspace, , , $connectionId] = seSetup();

    sePostSocial($workspace, $connectionId, 'group_event', 'group_chua_ton_tai', [
        'type' => 'update', 'data' => ['groupName' => 'X'],
    ], 'zps:se:orphan1')->assertOk()->assertJsonPath('message', 'social_event_no_conversation');
});

it('friend_event ADD (type=0) trên thread 1-1 → dòng friend_system + activity contact', function () {
    Event::fake([ConversationSystemLine::class]);
    [$workspace, $accountId, , $connectionId] = seSetup();

    $contact = new Contact;
    $contact->first_name = 'Khách kết bạn';
    $contact->save();

    $direct = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'sender_uid' => 'peer_friend_1',
        'thread_type' => 0,
        'contact_id' => $contact->id,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    sePostSocial($workspace, $connectionId, 'friend_event', 'peer_friend_1', [
        'type' => 0, 'threadId' => 'peer_friend_1',
    ], 'zps:se:friend1')->assertOk()->assertJsonPath('message', 'social_event_materialized');

    $row = DB::table('conversation_events')->where('conversation_id', $direct->id)->where('kind', 'friend_system')->sole();
    expect(json_decode((string) $row->payload, true)['act'])->toBe('friend_accepted');

    expect(Activity::where('subject_id', $contact->id)->where('action', 'contact.friend_accepted')->count())->toBe(1);
});

it('stream trả dòng hệ thống với payload để FE render', function () {
    [$workspace, , $conversation, $connectionId] = seSetup();
    // Cần user đăng nhập cho route stream
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    actingInWorkspace($workspace, $user);

    sePostSocial($workspace, $connectionId, 'group_event', $conversation->sender_uid, [
        'type' => 'join', 'data' => ['updateMembers' => [['id' => '1', 'dName' => 'Anh Bảy']]],
    ], 'zps:se:join1')->assertOk();

    actingInWorkspace($workspace, $user);
    $items = $this->getJson(route('inbox.stream', $conversation->id))->assertOk()->json('items');
    $line = collect($items)->firstWhere('kind', 'group_system');

    expect($line['payload']['label'])->toContain('Anh Bảy');
});
