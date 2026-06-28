<?php

use App\Exceptions\QuotaExceededException;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloCircuitOpenException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException;
use App\Modules\Integration\Chat\ZaloPersonal\SendRateLimiter;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloHealthMonitor;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloSendService;
use App\Services\MeteringService;
use App\Support\TenantScope;
use Carbon\Carbon;
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
 * ZaloConnection insert qua pgsql_privileged (bypass RLS + sequence grant).
 *
 * @group channel-zalo
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tạo workspace + zalo_connection (pgsql_privileged) + conversation.
 * Trả [$workspace, $connectionId (int), $conversation].
 */
function makeWorkspaceAndConversation(int $connId = 9991): array
{
    $workspace = Workspace::factory()->create();
    TenantScope::bind($workspace->id);
    app()->instance('currentWorkspace', $workspace);

    // Insert zalo_connection qua pgsql_privileged (bypass RLS + sequence permission)
    $nextVal = (int) DB::connection('pgsql_privileged')
        ->selectOne("SELECT nextval('zalo_connection_id_seq') AS id")
        ->id;

    DB::connection('pgsql_privileged')->table('zalo_connections')->insert([
        'workspace_id' => $workspace->id,
        'connection_id' => $nextVal,
        'state' => 'connected',
        'lock_version' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Tạo conversation (Eloquent — workspace bound)
    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'zalo_connection_id' => $nextVal,
        'peer_uid' => 'peer_test_'.uniqid(),
        'peer_phone' => '0901234567',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    return [$workspace, $nextVal, $conversation];
}

function makeSendService(): ZaloSendService
{
    // MeteringService thật: workspace bound + chưa có purchase → free plan (remaining 50)
    // → assertCanSend pass cho conv mới (tương đương no-op cũ). Quota-block test riêng.
    return new ZaloSendService(
        rateLimiter: new SendRateLimiter,
        healthMonitor: app(ZaloHealthMonitor::class),
        meteringService: app(MeteringService::class),
    );
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
        meteringService: app(MeteringService::class),
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

    $row = DB::connection('pgsql_privileged')
        ->table('zalo_connections')
        ->where('connection_id', $nextVal)
        ->first();

    expect($row->state)->toBe('connected');
})->group('channel-zalo');

// ── F1-audit: ZaloSendService quota enforce ───────────────────────────────────

it('F1-audit: ZaloSendService::send throws QuotaExceededException khi meteringGate::assertCanSend throw', function () {
    [, , $conversation] = makeWorkspaceAndConversation();

    // MeteringService mock luôn throw (mô phỏng workspace hết quota, conv mới)
    $blockingMeter = mock(MeteringService::class, function (MockInterface $m) {
        $m->shouldReceive('assertCanSend')->andThrow(new QuotaExceededException);
    });

    $service = new ZaloSendService(
        rateLimiter: new SendRateLimiter,
        healthMonitor: app(ZaloHealthMonitor::class),
        meteringService: $blockingMeter,
    );

    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));

    // Phải throw QuotaExceededException — KHÔNG gửi bridge
    expect(fn () => $service->send($conversation, 'Hello'))
        ->toThrow(QuotaExceededException::class);

    // KHÔNG ghi Message (bridge chưa được gọi)
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
    $message = makeSendService()->send($conversation, 'Reply F5');

    expect($message)->toBeInstanceOf(Message::class)
        ->and($message->direction)->toBe('out');

    Carbon::setTestNow();
})->group('channel-zalo');
