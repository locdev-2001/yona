<?php

use App\Events\ConversationTyping;
use App\Events\MessageStateChanged;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\MessageSourceAlias;
use App\Models\PendingMessageState;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloSendService;
use App\Modules\Chat\Adapter\ZaloPersonal\Intake\ZaloStateEventParser;
use App\Modules\Chat\Intake\DuplicateResolver;
use App\Modules\Chat\Status\MessageStatusService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

/**
 * P02 — message-state pipeline: undo/seen/delivered/reaction đi theo messages.
 * Idempotency không kho · event-trước-tin (undo pending, chatty drop) ·
 * group receipt guard cứng · KHÔNG meter.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function msSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_state_'.uniqid(),
        'status' => 'connected',
    ]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'peer_uid' => 'peer_state_'.uniqid(),
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    return [$workspace, $account, $conversation];
}

function msMessage(Conversation $conversation, string $sourceId, string $direction = 'out', int $threadType = 0): Message
{
    return Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => $direction,
        'type' => 'text',
        'body' => 'tin '.$sourceId,
        'source_id' => $sourceId,
        'platform_sent_at' => now(),
    ]);
}

function msService(): MessageStatusService
{
    return new MessageStatusService(new DuplicateResolver);
}

// ── Recall (undo) ────────────────────────────────────────────────────────────

it('applyRecall set recalled_at set-once — replay không đổi giá trị (idempotent)', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();
    $message = msMessage($conversation, 'zmsg_recall_1', 'in');

    $recall = ['target_msg_id' => 'zmsg_recall_1', 'recalled_at' => Carbon::parse('2026-07-04 10:00:00')];

    expect(msService()->applyRecall($account->id, $recall))->toBe('applied');
    $firstValue = $message->fresh()->recalled_at;
    expect($firstValue)->not->toBeNull();

    // Replay với ts KHÁC → không ghi đè
    $replay = ['target_msg_id' => 'zmsg_recall_1', 'recalled_at' => Carbon::parse('2026-07-04 11:30:00')];
    expect(msService()->applyRecall($account->id, $replay))->toBe('noop')
        ->and($message->fresh()->recalled_at->equalTo($firstValue))->toBeTrue();

    Event::assertDispatchedTimes(MessageStateChanged::class, 1);
});

it('undo đến TRƯỚC tin → pending bounded; ingest tin về sau → recalled_at áp lại + pending xoá', function () {
    Event::fake([MessageStateChanged::class]);
    [$workspace, $account, $conversation] = msSetup();

    $recall = [
        'target_msg_id' => 'zmsg_future_9',
        'recalled_at' => Carbon::parse('2026-07-04 09:00:00'),
        'payload' => ['recalled_at' => '2026-07-04T09:00:00+07:00'],
    ];

    expect(msService()->applyRecall($account->id, $recall))->toBe('pending');
    expect(PendingMessageState::where('target_msg_id', 'zmsg_future_9')->count())->toBe(1);

    // Replay undo khi vẫn chưa có tin → vẫn 1 pending (unique, insertOrIgnore)
    expect(msService()->applyRecall($account->id, $recall))->toBe('pending');
    expect(PendingMessageState::where('target_msg_id', 'zmsg_future_9')->count())->toBe(1);

    // Tin về sau → applyPendingFor áp recall + xoá pending
    $message = msMessage($conversation, 'zmsg_future_9', 'in');
    msService()->applyPendingFor($message);

    expect($message->fresh()->recalled_at)->not->toBeNull()
        ->and(PendingMessageState::where('target_msg_id', 'zmsg_future_9')->count())->toBe(0);
});

// ── Receipts (seen/delivered) ────────────────────────────────────────────────

it('applyReceipts: delivered set-once; seen set cả delivered nếu thiếu; replay no-op', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();
    $message = msMessage($conversation, 'zmsg_seen_1', 'out');

    msService()->applyReceipts($account->id, [['target_msg_id' => 'zmsg_seen_1', 'kind' => 'seen']]);

    $fresh = $message->fresh();
    expect($fresh->seen_at)->not->toBeNull()
        ->and($fresh->delivered_at)->not->toBeNull();

    $seenAt = $fresh->seen_at;
    $this->travel(1)->hours();
    msService()->applyReceipts($account->id, [['target_msg_id' => 'zmsg_seen_1', 'kind' => 'seen']]);
    expect($message->fresh()->seen_at->equalTo($seenAt))->toBeTrue();

    Event::assertDispatchedTimes(MessageStateChanged::class, 1);
});

it('receipt cho tin direction=in bị bỏ qua (receipt là trạng thái tin MÌNH gửi)', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();
    $inbound = msMessage($conversation, 'zmsg_in_1', 'in');

    msService()->applyReceipts($account->id, [['target_msg_id' => 'zmsg_in_1', 'kind' => 'seen']]);

    expect($inbound->fresh()->seen_at)->toBeNull();
    Event::assertNotDispatched(MessageStateChanged::class);
});

it('GROUP receipt guard cứng: hội thoại nhóm KHÔNG mutate scalar seen_at/delivered_at', function () {
    Event::fake([MessageStateChanged::class]);
    [$workspace, $account] = msSetup();

    $group = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $account->id,
        'peer_uid' => 'group_'.uniqid(),
        'thread_kind' => 'group',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
    $message = msMessage($group, 'zmsg_group_1', 'out', 1);

    // Guard tầng service (parser đã lọc, đây là guard thứ 2)
    msService()->applyReceipts($account->id, [['target_msg_id' => 'zmsg_group_1', 'kind' => 'seen']]);

    $fresh = $message->fresh();
    expect($fresh->seen_at)->toBeNull()->and($fresh->delivered_at)->toBeNull();
});

it('chatty drop-on-miss CÓ CHỦ ĐÍCH: reaction/receipt tới trước tin → message về sau KHÔNG áp', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();

    // Bơm reaction + seen cho tin CHƯA tồn tại → drop (không pending, không lỗi)
    msService()->applyReactions($account->id, [[
        'target_msg_id' => 'zmsg_notyet_5',
        'reactor_uid' => 'peer_1',
        'icon' => '/-heart',
        'reacted_at' => now(),
    ]]);
    msService()->applyReceipts($account->id, [['target_msg_id' => 'zmsg_notyet_5', 'kind' => 'seen']]);

    expect(PendingMessageState::count())->toBe(0);

    // Tin về SAU → không có gì áp lại (đúng spec drop-on-miss)
    $message = msMessage($conversation, 'zmsg_notyet_5', 'out');
    msService()->applyPendingFor($message);

    $fresh = $message->fresh();
    expect($fresh->seen_at)->toBeNull()
        ->and(MessageReaction::where('message_id', $message->id)->count())->toBe(0);
});

// ── Reactions ────────────────────────────────────────────────────────────────

it('applyReactions: upsert per (message, reactor) — đổi icon update, NONE delete, replay idempotent', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();
    $message = msMessage($conversation, 'zmsg_react_1', 'out');

    $base = ['target_msg_id' => 'zmsg_react_1', 'reactor_uid' => 'peer_9'];

    // Thả tim
    msService()->applyReactions($account->id, [$base + ['icon' => '/-heart', 'reacted_at' => Carbon::parse('2026-07-04 10:00:00')]]);
    expect(MessageReaction::where('message_id', $message->id)->sole()->icon)->toBe('/-heart');

    // Đổi icon (ts mới hơn) → update, vẫn 1 row
    msService()->applyReactions($account->id, [$base + ['icon' => ':>', 'reacted_at' => Carbon::parse('2026-07-04 10:05:00')]]);
    $row = MessageReaction::where('message_id', $message->id)->sole();
    expect($row->icon)->toBe(':>');

    // Event CŨ hơn out-of-order → KHÔNG ghi đè (monotonic MED-1)
    msService()->applyReactions($account->id, [$base + ['icon' => '/-heart', 'reacted_at' => Carbon::parse('2026-07-04 09:59:00')]]);
    expect(MessageReaction::where('message_id', $message->id)->sole()->icon)->toBe(':>');

    // NONE (icon rỗng, ts mới) = gỡ cảm xúc
    msService()->applyReactions($account->id, [$base + ['icon' => '', 'reacted_at' => Carbon::parse('2026-07-04 10:10:00')]]);
    expect(MessageReaction::where('message_id', $message->id)->count())->toBe(0);
});

it('NONE out-of-order (ts cũ hơn reaction hiện tại) KHÔNG xoá — chống cảm xúc ma', function () {
    Event::fake([MessageStateChanged::class]);
    [, $account, $conversation] = msSetup();
    msMessage($conversation, 'zmsg_react_2', 'out');

    $base = ['target_msg_id' => 'zmsg_react_2', 'reactor_uid' => 'peer_9'];
    msService()->applyReactions($account->id, [$base + ['icon' => '/-heart', 'reacted_at' => Carbon::parse('2026-07-04 10:00:00')]]);
    msService()->applyReactions($account->id, [$base + ['icon' => '', 'reacted_at' => Carbon::parse('2026-07-04 09:00:00')]]);

    expect(MessageReaction::count())->toBe(1);
});

// ── Parser (shape từ zca source — Undo.ts/Reaction.ts/SeenMessage.ts) ────────

it('parser: undo target = content.globalMsgId (KHÔNG phải data.msgId của hành động undo)', function () {
    $parsed = app(ZaloStateEventParser::class)->parseUndo([[
        'data' => [
            'msgId' => 'ACTION_ID_999',
            'content' => ['globalMsgId' => 777111, 'cliMsgId' => 123],
            'ts' => '1751600000000',
        ],
        'threadId' => '111',
    ]]);

    expect($parsed['target_msg_id'])->toBe('777111')
        ->and($parsed['recalled_at'])->not->toBeNull();
});

it('parser: reaction target = content.rMsg[].gMsgID, reactor = uidFrom, NONE giữ icon rỗng', function () {
    $parsed = app(ZaloStateEventParser::class)->parseReactions([[
        'data' => [
            'msgId' => 'ACTION_ID_123',
            'uidFrom' => '222333',
            'content' => ['rMsg' => [['gMsgID' => '888222', 'cMsgID' => '1', 'msgType' => 1]], 'rIcon' => '/-heart', 'rType' => 0],
            'ts' => '1751600001000',
        ],
        'threadId' => '222333',
    ]]);

    expect($parsed)->toHaveCount(1)
        ->and($parsed[0]['target_msg_id'])->toBe('888222')
        ->and($parsed[0]['reactor_uid'])->toBe('222333')
        ->and($parsed[0]['icon'])->toBe('/-heart');
});

it('parser: seen list per-item data.msgId; item NHÓM (type=1/groupId) bị loại ngay tại parser', function () {
    $receipts = app(ZaloStateEventParser::class)->parseReceipts([[
        ['type' => 0, 'data' => ['msgId' => 'm1', 'idTo' => '111'], 'threadId' => '111'],
        ['type' => 1, 'data' => ['msgId' => 'm2', 'groupId' => 'g9', 'seenUids' => ['a']], 'threadId' => 'g9'],
        ['type' => 0, 'data' => ['msgId' => 'm3', 'idTo' => '111'], 'threadId' => '111'],
    ]], 'seen');

    expect(array_column($receipts, 'target_msg_id'))->toBe(['m1', 'm3']);
});

// ── Webhook wiring ───────────────────────────────────────────────────────────

function msWebhookSetup(): array
{
    // Webhook resolve workspace/channel_account qua pgsql_privileged (session khác)
    // → chuỗi identity (workspace → channel_account → zalo_connection) phải
    // COMMITTED qua privileged (FK chain). Conversation/message vẫn đi default
    // connection (cùng transaction với webhook handling in-process).
    // Pattern WebhookContractTest gap test; row identity nhỏ, không cleanup
    // (nhất quán relayTestConnection).
    $priv = fn (string $table) => DB::connection('pgsql_privileged')->table($table);

    $wsId = (string) Str::uuid();
    $priv('workspaces')->insert([
        'id' => $wsId, 'name' => 'WS MsgState', 'slug' => 'ws-msgstate-'.uniqid(),
        'base_currency' => 'VND', 'timezone' => 'Asia/Ho_Chi_Minh', 'locale' => 'vi',
        'audit_retention' => '1y', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $accountId = (string) Str::uuid();
    $priv('channel_accounts')->insert([
        'id' => $accountId, 'workspace_id' => $wsId, 'channel' => 'zalo_personal',
        'account_uid' => 'uid_wh_'.uniqid(), 'status' => 'connected',
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
        'peer_uid' => 'peer_wh_'.uniqid(),
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $wsId),
    ]);

    $account = ChannelAccount::find($accountId);

    config(['services.zalo_bridge.webhook_secret' => 'test-secret']);

    return [$workspace, $account, $conversation, $connectionId];
}

function msPostRelay(Workspace $workspace, int $connectionId, string $eventType, array $payload): TestResponse
{
    $response = test()->postJson(route('zalo.webhook'), [
        'type' => 'relay_event',
        'event_type' => $eventType,
        'connection_id' => $connectionId,
        'payload' => $payload,
    ], ['X-Zalo-Personal-Bridge-Secret' => 'test-secret']);

    // Webhook finally{TenantScope::forget()} reset RLS context — re-bind để
    // assertion Eloquent/DB sau đó còn thấy row của workspace test.
    app()->instance('currentWorkspace', $workspace);
    setWorkspaceContext($workspace->id);

    return $response;
}

it('webhook: undo end-to-end → recalled_at set, KHÔNG meter', function () {
    Event::fake([MessageStateChanged::class]);
    [$workspace, , $conversation, $connectionId] = msWebhookSetup();
    $message = msMessage($conversation, 'zmsg_wh_1', 'in');

    $before = DB::table('channel_usage')->count();

    msPostRelay($workspace, $connectionId, 'undo', [[
        'data' => ['msgId' => 'UNDO_ACT', 'content' => ['globalMsgId' => 'zmsg_wh_1'], 'ts' => '1751600000000'],
        'threadId' => $conversation->peer_uid,
    ]])->assertOk();

    expect($message->fresh()->recalled_at)->not->toBeNull()
        ->and(DB::table('channel_usage')->count())->toBe($before);
    Event::assertDispatched(MessageStateChanged::class);
});

it('webhook: typing → broadcast ConversationTyping, KHÔNG ghi DB', function () {
    Event::fake([ConversationTyping::class]);
    [$workspace, , $conversation, $connectionId] = msWebhookSetup();

    $messagesBefore = DB::table('messages')->count();

    msPostRelay($workspace, $connectionId, 'typing', [[
        'type' => 0,
        'data' => ['uid' => $conversation->peer_uid, 'ts' => '1751600000000', 'isPC' => 0],
        'threadId' => $conversation->peer_uid,
    ]])->assertOk();

    Event::assertDispatched(ConversationTyping::class, function (ConversationTyping $e) use ($conversation) {
        return $e->conversationId === $conversation->id;
    });
    expect(DB::table('messages')->count())->toBe($messagesBefore);
});

it('webhook: event LẠ → 200 + log redacted, KHÔNG kho (P09: bảng relay_events đã drop)', function () {
    [$workspace, , , $connectionId] = msWebhookSetup();

    msPostRelay($workspace, $connectionId, 'brand_new_zca_event', [['some' => 'shape']])
        ->assertOk()
        ->assertJsonPath('message', 'relay_event_unknown_logged');

    // P09: bảng relay_events không còn tồn tại
    $tableExists = DB::selectOne("SELECT to_regclass('public.relay_events') AS t")->t;
    expect($tableExists)->toBeNull();
});

it('webhook: bơm 100 state-event KHÔNG đổi channel_usage (seam metering)', function () {
    Event::fake([MessageStateChanged::class]);
    [$workspace, , $conversation, $connectionId] = msWebhookSetup();
    msMessage($conversation, 'zmsg_seam_1', 'out');

    $before = DB::table('channel_usage')->count();

    for ($i = 0; $i < 50; $i++) {
        msPostRelay($workspace, $connectionId, 'seen_messages', [[
            ['type' => 0, 'data' => ['msgId' => 'zmsg_seam_1', 'idTo' => 'x'], 'threadId' => 'x'],
        ]])->assertOk();
        msPostRelay($workspace, $connectionId, 'reaction', [[
            'data' => [
                'uidFrom' => 'peer_x',
                'content' => ['rMsg' => [['gMsgID' => 'zmsg_seam_1']], 'rIcon' => '/-heart'],
                'ts' => (string) (1751600000000 + $i),
            ],
        ]])->assertOk();
    }

    expect(DB::table('channel_usage')->count())->toBe($before);
});

// ── Race 23505: echo về trước khi portal persist (review MED-2) ──────────────

it('race 23505: echo insert trước → portal send merge vào row echo, không lỗi giả, không double stream_version', function () {
    Carbon::setTestNow(
        Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh')
    );
    [$workspace, $account, $conversation] = msSetup();

    ZaloConnection::create([
        'workspace_id' => $workspace->id,
        'connection_id' => ZaloConnection::nextConnectionId(),
        'channel_account_id' => $account->id,
        'state' => 'connected',
        'lock_version' => 0,
    ]);

    // Echo self-listen về TRƯỚC (webhook đã tạo row + bump stream_version)
    $echoRow = Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conversation->id,
        'direction' => 'echo',
        'type' => 'text',
        'body' => null,
        'source_id' => 'race_src_1',
        'platform_sent_at' => now(),
        'platform_meta' => ['zca_message' => ['msgId' => 'race_src_1', 'cliMsgId' => '999']],
    ]);
    $svBefore = (int) $conversation->fresh()->stream_version;

    Http::fake([
        '*personal-messages/send*' => Http::response([
            'ok' => true,
            'source_id' => 'race_src_1',
            'source_ids' => ['race_src_1', 'race_src_extra'],
        ], 200),
    ]);

    $message = app(ZaloSendService::class)
        ->send($conversation, 'tin từ portal');

    expect($message->id)->toBe($echoRow->id)
        ->and($message->direction)->toBe('echo')                       // identity KHÔNG lật
        ->and($message->body)->toBe('tin từ portal')                   // merge phần portal biết
        ->and($message->platform_meta['zca_message']['cliMsgId'])->toBe('999') // meta echo giữ nguyên
        ->and(Message::where('source_id', 'race_src_1')->count())->toBe(1)
        ->and((int) $conversation->fresh()->stream_version)->toBe($svBefore); // KHÔNG bump lần 2

    // Alias msgId phụ vẫn ghi về đúng row
    expect(MessageSourceAlias::where('source_id', 'race_src_extra')->sole()->message_id)->toBe($echoRow->id);

    Carbon::setTestNow();
});
