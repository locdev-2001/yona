<?php

use App\Exceptions\QuotaExceededException;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\ZaloConnection;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloCircuitOpenException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException;
use App\Modules\Integration\Chat\ZaloPersonal\SendRateLimiter;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloHealthMonitor;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloSendService;
use App\Services\Inbox\MessagePublisher;
use App\Services\Inbox\OutboundSendPipeline;
use App\Services\MeteringService;
use App\Support\TenantScope;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Mockery\MockInterface;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Unit / integration tests cho ZaloSendService, SendRateLimiter, ZaloHealthMonitor.
 *
 * Không cần bridge thật — dùng Http::fake().
 * ZaloConnection::nextConnectionId() dùng pgsql_privileged CHỈ cho nextval()
 * (sequence — không bị vấn đề visibility xuyên session); INSERT bảng thật
 * (channel_accounts, zalo_connections, conversations) đi qua connection mặc
 * định (RLS-bound) để cùng session với Workspace factory (xem makeChannelAccount).
 *
 * @group channel-zalo
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tạo workspace + channel_account + zalo_connection connected + conversation
 * gắn channel_account_id (P03: outbound resolve qua account).
 *
 * Insert qua connection mặc định (RLS-bound, TenantScope::bind đã set
 * app.current_workspace) — KHÔNG dùng pgsql_privileged: đó là 1 session
 * Postgres riêng, không thấy được row Workspace vừa tạo còn nằm trong
 * transaction test-wrapping (DatabaseTransactions chỉ wrap connection mặc
 * định) → FK violation vào channel_accounts.workspace_id. zalo_connections
 * vẫn cần pgsql_privileged CHỈ để lấy nextval() (sequence, không phải row —
 * không bị vấn đề visibility).
 *
 * Trả [$workspace, $connectionId (int), $conversation].
 */
function makeWorkspaceAndConversation(int $connId = 9991): array
{
    $workspace = Workspace::factory()->create();
    TenantScope::bind($workspace->id);
    app()->instance('currentWorkspace', $workspace);

    $accountId = makeChannelAccount($workspace->id);
    $nextVal = makeConnectedSlot($workspace->id, $accountId);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'peer_uid' => 'peer_test_'.uniqid(),
        'peer_phone' => '0901234567',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    return [$workspace, $nextVal, $conversation];
}

function makeChannelAccount(string $workspaceId, string $status = 'connected'): string
{
    $account = ChannelAccount::create([
        'workspace_id' => $workspaceId,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_'.uniqid(),
        'status' => $status,
    ]);

    return $account->id;
}

function makeConnectedSlot(string $workspaceId, ?string $channelAccountId, string $state = 'connected'): int
{
    $nextVal = ZaloConnection::nextConnectionId();

    ZaloConnection::create([
        'workspace_id' => $workspaceId,
        'connection_id' => $nextVal,
        'channel_account_id' => $channelAccountId,
        'state' => $state,
        'lock_version' => 0,
    ]);

    return $nextVal;
}

function makeSendService(): ZaloSendService
{
    // P11: metering ĐÃ hoist lên OutboundSendPipeline — service = policy + transport.
    return new ZaloSendService(
        rateLimiter: new SendRateLimiter,
        healthMonitor: app(ZaloHealthMonitor::class),
    );
}

/** P11 — đường outbound THẬT: pipeline (quota gate + meterReply) bọc driver. */
function makeSendPipeline(): OutboundSendPipeline
{
    return new OutboundSendPipeline(app(MeteringService::class), app(MessagePublisher::class));
}

// ── ZaloSendService: send thành công ─────────────────────────────────────────

it('sends message and writes Message row (direction=out) when bridge ok', function () {
    [$workspace, $connId, $conversation] = makeWorkspaceAndConversation();

    Http::fake([
        '*personal-messages/send*' => Http::response([
            'ok' => true,
            'source_id' => 'bridge_msg_001',
        ], 200),
    ]);

    // Set time trong cửa sổ (10h VN)
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    $message = makeSendService()->send($conversation, 'Hello Zalo');

    expect($message)->toBeInstanceOf(Message::class)
        ->and($message->direction)->toBe('out')
        ->and($message->source_id)->toBe('bridge_msg_001')
        ->and($message->body)->toBe('Hello Zalo');

    Carbon::setTestNow();
})->group('channel-zalo');

it('does NOT write Message when bridge returns 503 (not_logged_in)', function () {
    [$workspace, $connId, $conversation] = makeWorkspaceAndConversation();

    Http::fake([
        '*personal-messages/send*' => Http::response(['ok' => false, 'message' => 'not_logged_in'], 503),
    ]);

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => makeSendService()->send($conversation, 'Hello'))
        ->toThrow(ZaloNotConnectedException::class);

    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(0);

    Carbon::setTestNow();
})->group('channel-zalo');

it('does NOT write Message on bridge connection exception', function () {
    [$workspace, $connId, $conversation] = makeWorkspaceAndConversation();

    Http::fake([
        '*personal-messages/send*' => fn () => throw new Exception('Connection refused'),
    ]);

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => makeSendService()->send($conversation, 'Hello'))
        ->toThrow(ZaloNotConnectedException::class);

    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(0);

    Carbon::setTestNow();
})->group('channel-zalo');

// ── P03: resolveConnection theo channel_account_id (0/1/>1 slot) ──────────────

it('P03: throws ZaloNotConnectedException with account display_name when 0 slot connected', function () {
    $workspace = Workspace::factory()->create();
    TenantScope::bind($workspace->id);
    app()->instance('currentWorkspace', $workspace);

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_no_slot',
        'display_name' => 'Cửa hàng ABC',
        'status' => 'session_lost',
    ]);
    $accountId = $account->id;

    // Slot của account nhưng KHÔNG connected → resolveConnection phải fail-closed
    makeConnectedSlot($workspace->id, $accountId, state: 'session_lost');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => $accountId,
        'peer_uid' => 'peer_test_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => makeSendService()->send($conversation, 'Hello'))
        ->toThrow(ZaloNotConnectedException::class, 'Cửa hàng ABC cần quét lại QR.');

    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(0);

    Carbon::setTestNow();
})->group('channel-zalo');

// Test "ZaloSplitBrainException khi >1 slot connected cùng account" đã XOÁ: kể từ
// P02(g) swap, zalo_connections_account_connected_unique (partial, state='connected'
// AND deleted_at IS NULL) khiến kịch bản này KHÔNG THỂ tạo qua INSERT ứng dụng nữa —
// đụng 23505 ngay lập tức, đúng thiết kế. Từng thử drop/recreate index tạm qua
// pgsql_privileged để vẫn dựng được kịch bản, nhưng CREATE/DROP INDEX (kể cả
// CONCURRENTLY) trên 1 session KHÁC luôn phải đợi transaction đang mở của chính
// test này (connection mặc định, DatabaseTransactions) buông zalo_connections —
// mà transaction đó chỉ buông SAU khi hàm test return, tạo deadlock tự thân, treo
// vô thời hạn (xác nhận qua 3 lần chạy bị kẹt). resolveConnection()'s >1-slot branch
// (ZaloSendService.php) vẫn giữ lại như lưới an toàn cho dữ liệu lịch sử/thao tác SQL
// trực tiếp, không còn đường tái tạo qua code path bình thường để viết test tích hợp.

// P09 spike #9 — bằng chứng trực tiếp: partial-unique CHẶN >1 slot 'connected'/account
// ở tầng DB (không qua resolveConnection(), không cần drop/recreate index).
it('spike #9: DB partial-unique zalo_connections_account_connected_unique blocks a 2nd connected slot for the same account', function () {
    $workspace = Workspace::factory()->create();
    TenantScope::bind($workspace->id);
    app()->instance('currentWorkspace', $workspace);

    $accountId = makeChannelAccount($workspace->id);
    makeConnectedSlot($workspace->id, $accountId);

    // DB::transaction() mở SAVEPOINT (đã có transaction ngoài của DatabaseTransactions) —
    // để 23505 không đầu độc luôn transaction ngoài, chỉ rollback riêng câu insert này.
    expect(fn () => DB::transaction(fn () => makeConnectedSlot($workspace->id, $accountId)))
        ->toThrow(QueryException::class);

    expect(ZaloConnection::connectedForAccount($workspace->id, $accountId))->toHaveCount(1);
})->group('channel-zalo');

// ── SendRateLimiter ───────────────────────────────────────────────────────────

it('throws SendOutsideWindowException before 7h VN', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 06:59:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => (new SendRateLimiter)->assertCanSend('ws-1', '0901234567'))
        ->toThrow(SendOutsideWindowException::class);

    Carbon::setTestNow();
})->group('channel-zalo');

it('throws SendOutsideWindowException at 22h VN', function () {
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 22:00:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => (new SendRateLimiter)->assertCanSend('ws-1', '0901234567'))
        ->toThrow(SendOutsideWindowException::class);

    Carbon::setTestNow();
})->group('channel-zalo');

it('allows send inside window at 10h VN', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    $limiter = new SendRateLimiter;
    $limiter->assertCanSend('ws-window-ok', '0901111111'); // no exception

    expect($limiter->currentCount('ws-window-ok', '0901111111'))->toBe(0);

    Carbon::setTestNow();
})->group('channel-zalo');

it('throws RateCapException on 4th message to same number same day', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    $limiter = new SendRateLimiter;
    $ws = 'ws-cap-'.uniqid();
    $num = '0909111222';

    // Tin 1-3: assert ok + increment
    foreach (range(1, 3) as $_) {
        $limiter->assertCanSend($ws, $num);
        $limiter->increment($ws, $num);
    }

    // Tin 4: phải throw RateCapException
    expect(fn () => $limiter->assertCanSend($ws, $num))
        ->toThrow(RateCapException::class);

    Carbon::setTestNow();
})->group('channel-zalo');

it('isReply=true skips BOTH the daily cap and the hour window (reply is normal chat, not QC)', function () {
    Cache::flush();
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    $limiter = new SendRateLimiter;
    $ws = 'ws-reply-'.uniqid();
    $num = '0909333444';

    foreach (range(1, 3) as $_) {
        $limiter->increment($ws, $num);
    }

    // Cap đã đầy — tin chủ động bị chặn, tin trả lời thì KHÔNG.
    expect(fn () => $limiter->assertCanSend($ws, $num))->toThrow(RateCapException::class);
    $limiter->assertCanSend($ws, $num, isReply: true); // no exception

    // 23h: tin chủ động bị chặn cửa sổ giờ; tin TRẢ LỜI vẫn gửi được
    // (khách nhắn 23h → trả lời 23h là chat bình thường, không phải QC).
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 23:00:00', 'Asia/Ho_Chi_Minh'));
    expect(fn () => $limiter->assertCanSend($ws, $num))->toThrow(SendOutsideWindowException::class);
    $limiter->assertCanSend($ws, $num, isReply: true); // no exception

    Carbon::setTestNow();
})->group('channel-zalo');

it('send() bypasses the cap when peer has inbound within 24h, but enforces it for proactive sends', function () {
    [$workspace, $connId, $conversation] = makeWorkspaceAndConversation();

    Http::fake([
        '*personal-messages/send*' => Http::response(['ok' => true, 'source_id' => 'bridge_reply_ok'], 200),
    ]);
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    // Nạp đầy cap 3/ngày cho số này.
    $limiter = new SendRateLimiter;
    $targetNumber = $conversation->peer_phone ?? $conversation->peer_uid;
    foreach (range(1, 3) as $_) {
        $limiter->increment($workspace->id, $targetNumber);
    }

    // CHƯA có inbound → tin chủ động → cap chặn.
    expect(fn () => makeSendService()->send($conversation, 'tin QC thứ 4'))
        ->toThrow(RateCapException::class);

    // Khách nhắn vào (inbound trong 24h) → tin gửi là TRẢ LỜI → được gửi, không tiêu cap.
    Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'khách hỏi giá',
        'source_id' => 'src_reply_in_'.uniqid(),
        'platform_sent_at' => now(),
    ]);

    $sent = makeSendService()->send($conversation, 'dạ giá 100k nhé chị');

    expect($sent->direction)->toBe('out');
    expect($limiter->currentCount($workspace->id, $targetNumber))->toBe(3); // không increment thêm

    Carbon::setTestNow();
})->group('channel-zalo');

// ── ZaloHealthMonitor (circuit-breaker) ────────────────────────────────────

it('opens circuit after 5 errors within window', function () {
    Cache::flush();

    $monitor = new ZaloHealthMonitor;
    $connId = 'conn-circuit-'.uniqid();

    expect($monitor->isCircuitOpen($connId))->toBeFalse();

    foreach (range(1, 5) as $_) {
        $monitor->recordError($connId, '429');
    }

    expect($monitor->isCircuitOpen($connId))->toBeTrue();
})->group('channel-zalo');

it('resets circuit after reset() call', function () {
    Cache::flush();

    $monitor = new ZaloHealthMonitor;
    $connId = 'conn-reset-'.uniqid();

    foreach (range(1, 5) as $_) {
        $monitor->recordError($connId, '403');
    }

    expect($monitor->isCircuitOpen($connId))->toBeTrue();

    $monitor->reset($connId);
    expect($monitor->isCircuitOpen($connId))->toBeFalse();
})->group('channel-zalo');

it('throws ZaloCircuitOpenException when circuit is open before send', function () {
    Cache::flush();
    [$workspace, $connId, $conversation] = makeWorkspaceAndConversation();

    $monitor = new ZaloHealthMonitor;
    foreach (range(1, 5) as $_) {
        $monitor->recordError((string) $connId, '429');
    }

    $service = new ZaloSendService(
        rateLimiter: new SendRateLimiter,
        healthMonitor: $monitor,
    );

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    expect(fn () => $service->send($conversation, 'Hello'))
        ->toThrow(ZaloCircuitOpenException::class);

    Carbon::setTestNow();
})->group('channel-zalo');

// ── ZaloConnectionController QR: store + promote ──────────────────────────────

it('store returns connection_id and qr_token when bridge qr/start ok', function () {
    $workspace = Workspace::factory()->create();

    // Seed user với permission tenant.zalo.manage trong workspace (spatie teams mode)
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    actingInWorkspace($workspace, $user);

    // Ensure permission exists + gán thẳng cho user trong workspace scope
    app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
    $perm = Permission::firstOrCreate(
        ['name' => 'tenant.zalo.manage', 'guard_name' => 'web']
    );
    $user->givePermissionTo($perm);

    Http::fake([
        '*auth/qr/start*' => Http::response(['ok' => true, 'phase' => 'logging_in'], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $workspace->id])
        ->postJson('/integrations/zalo')
        ->assertStatus(200)
        ->assertJsonFragment(['ok' => true])
        ->assertJsonStructure(['connection_id', 'qr_token']);
})->group('channel-zalo');

it('promote updates ZaloConnection state to connected when bridge promote ok', function () {
    $workspace = Workspace::factory()->create();

    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    actingInWorkspace($workspace, $user);

    app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
    $perm = Permission::firstOrCreate(
        ['name' => 'tenant.zalo.manage', 'guard_name' => 'web']
    );
    $user->givePermissionTo($perm);

    $nextVal = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspace->id,
        'connection_id' => $nextVal,
        'state' => 'qr_waiting',
        'lock_version' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    Http::fake([
        '*auth/qr/promote*' => Http::response(['ok' => true, 'connection_id' => $nextVal], 200),
    ]);

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $workspace->id])
        ->postJson('/integrations/zalo/promote', [
            'connection_id' => $nextVal,
            'qr_token' => 'test-qr-token',
        ])
        ->assertStatus(200)
        ->assertJsonFragment(['ok' => true]);

    // P10 [d]: promote update đi connection MẶC ĐỊNH (1 session cả cụm) — đọc
    // cùng session mới thấy thay đổi trong transaction test (privileged = session khác).
    $row = DB::table('zalo_connections')
        ->where('connection_id', $nextVal)
        ->first();

    expect($row->state)->toBe('connected');
})->group('channel-zalo');

// ── F1-audit: ZaloSendService quota enforce ───────────────────────────────────

it('F1-audit (P11): OutboundSendPipeline throws QuotaExceededException TRƯỚC khi driver được gọi', function () {
    [, , $conversation] = makeWorkspaceAndConversation();

    // MeteringService mock luôn throw (mô phỏng workspace hết quota, conv mới)
    $blockingMeter = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldReceive('assertCanSend')->andThrow(new QuotaExceededException);
    });

    $pipeline = new OutboundSendPipeline($blockingMeter, app(MessagePublisher::class));
    $driver = new ZaloChannelDriver(makeSendService());

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    Http::fake();

    // Phải throw QuotaExceededException — KHÔNG gửi bridge (money-path chặn trước transport)
    expect(fn () => $pipeline->send($driver, $conversation, ['text' => 'Hello']))
        ->toThrow(QuotaExceededException::class);

    Http::assertNothingSent();
    expect(Message::where('conversation_id', $conversation->id)->count())->toBe(0);

    Carbon::setTestNow();
})->group('channel-zalo');

it('F1-audit: ZaloSendService::send PASS khi conv mới + còn quota (free plan remaining 50)', function () {
    [, , $conversation] = makeWorkspaceAndConversation();

    Http::fake([
        '*personal-messages/send*' => Http::response(['ok' => true, 'source_id' => 'src_f5'], 200),
    ]);

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    // MeteringService: conv mới + free plan còn quota → assertCanSend pass → gửi được
    $driver = new ZaloChannelDriver(makeSendService());
    $message = makeSendPipeline()->send($driver, $conversation, ['text' => 'Reply F5']);

    expect($message)->toBeInstanceOf(Message::class)
        ->and($message->direction)->toBe('out');

    Carbon::setTestNow();
})->group('channel-zalo');
