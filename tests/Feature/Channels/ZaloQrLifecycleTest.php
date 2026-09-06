<?php

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Jobs\Zalo\ZaloHealthSweepJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Zalo\ZaloBridgeClient;
use App\Services\Zalo\ZaloHealthMonitor;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;

// Vòng đời đăng nhập QR — bridge giả bằng Http::fake() vì không có tài khoản Zalo thật.

function zaloUserOf(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

function fakeZaloBridge(array $overrides = []): void
{
    Http::fake([
        '127.0.0.1:3710/auth/qr/start' => Http::response(['ok' => true]),
        '127.0.0.1:3710/auth/qr/status*' => Http::response(['phase' => 'qr_waiting', 'qr_image' => 'data:image/png;base64,AAA']),
        '127.0.0.1:3710/auth/qr/promote' => Http::response([
            'personal_uid' => '1234567890',
            'display_name' => 'Chủ shop',
            'phone' => '+84901234567',
            'avatar' => 'https://zalo.example/avatar.jpg',
        ]),
        '127.0.0.1:3710/*' => Http::response(['ok' => true]),
        ...$overrides,
    ]);
}

function zaloSessionWebhook(int $connectionId, string $state, ?string $detail = null): TestResponse
{
    return test()->postJson('/webhooks/zalo', array_filter([
        'type' => 'bridge_session',
        'connection_id' => $connectionId,
        'state' => $state,
        'detail' => $detail,
    ]), ['X-Zalo-Personal-Bridge-Secret' => config('zalo.bridge.webhook_secret')]);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = zaloUserOf($this->account, AccountUser::ROLE_ADMINISTRATOR);
    $this->inbox = Inbox::factory()->zalo()->create(['account_id' => $this->account->id]);
    $this->channel = $this->inbox->channel;
    $this->channel->update(['zalo_uid' => null, 'state' => Zalo::STATE_QR_WAITING]);
});

it('tạo được inbox Zalo chỉ với tên', function () {
    fakeZaloBridge();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes", [
            'name' => 'Zalo cửa hàng',
            'channel' => ['type' => 'zalo'],
        ]);

    $response->assertOk();
    expect($response->json('channel_type'))->toBe('Channel::Zalo')
        ->and($response->json('zalo_state'))->toBe(Zalo::STATE_QR_WAITING);
});

it('chặn nhân viên thường mở phiên QR', function () {
    $agent = zaloUserOf($this->account, AccountUser::ROLE_AGENT);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertUnauthorized();
});

it('trả 404 với inbox không phải kênh Zalo', function () {
    $other = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$other->id}/zalo/qr")
        ->assertNotFound();
});

it('mở phiên QR và lưu qr_token', function () {
    fakeZaloBridge();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertOk();

    $this->channel->refresh();

    expect($response->json('ok'))->toBeTrue()
        ->and($this->channel->qr_token)->toBe($response->json('qr_token'))
        ->and($this->channel->last_qr_at)->not->toBeNull();
});

it('báo bridge chưa chạy thay vì lỗi thô', function () {
    Http::fake(fn () => throw new ConnectionException('refused'));

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertStatus(503)
        ->assertJsonPath('ok', false);
});

it('trả ảnh QR khi hỏi trạng thái', function () {
    fakeZaloBridge();
    $this->channel->update(['qr_token' => 'token-1']);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr_status")
        ->assertOk()
        ->assertJsonPath('phase', 'qr_waiting')
        ->assertJsonPath('qr_image', 'data:image/png;base64,AAA');
});

it('từ chối hỏi trạng thái khi chưa mở phiên QR', function () {
    fakeZaloBridge();

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr_status")
        ->assertStatus(409)
        ->assertJsonPath('error_code', 'qr_session_missing');
});

it('chốt phiên và ghi danh tính tài khoản Zalo', function () {
    fakeZaloBridge();
    $this->channel->update(['qr_token' => 'token-1']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/promote")
        ->assertOk()
        ->assertJsonPath('ok', true);

    $this->channel->refresh();

    expect($this->channel->state)->toBe(Zalo::STATE_CONNECTED)
        ->and($this->channel->zalo_uid)->toBe('1234567890')
        ->and($this->channel->display_name)->toBe('Chủ shop')
        ->and($this->channel->phone)->toBe('+84901234567')
        ->and($this->channel->qr_token)->toBeNull()
        ->and($this->channel->last_connected_at)->not->toBeNull();
});

it('từ chối khi quét nhầm tài khoản Zalo khác', function () {
    fakeZaloBridge();
    $this->channel->update(['qr_token' => 'token-1', 'zalo_uid' => '999', 'state' => Zalo::STATE_SESSION_LOST]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/promote")
        ->assertStatus(409)
        ->assertJsonPath('error_code', 'zalo_account_mismatch');

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_SESSION_LOST);
    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout'));
});

it('trả trạng thái sức khỏe kèm cờ ngắt mạch', function () {
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890']);
    $monitor = app(ZaloHealthMonitor::class);
    for ($i = 0; $i < 5; $i++) {
        $monitor->recordError($this->channel->connectionId(), '429');
    }

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/health")
        ->assertOk()
        ->assertJsonPath('state', Zalo::STATE_CONNECTED)
        ->assertJsonPath('circuit_open', true)
        ->assertJsonPath('error_count', 5);
});

it('mở phiên QR mới thì huỷ phiên quét dở trước đó ở bridge', function () {
    fakeZaloBridge();
    $this->channel->update(['qr_token' => 'token-cu']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertOk();

    // Không huỷ trước thì bridge trả 409 login_in_progress cho slot qr:* còn treo.
    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/qr/cancel')
        && $request['qr_token'] === 'token-cu');
});

it('không nối được cầu nối thì báo bridge_unreachable', function () {
    Http::fake(fn () => throw new ConnectionException('refused'));

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertStatus(503)
        ->assertJsonPath('error_code', 'bridge_unreachable');
});

it('cầu nối từ chối thì báo bridge_rejected chứ không nói cầu nối chưa chạy', function () {
    fakeZaloBridge(['127.0.0.1:3710/auth/qr/start' => Http::response(['message' => 'login_in_progress'], 409)]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/qr")
        ->assertStatus(409)
        ->assertJsonPath('error_code', 'bridge_rejected')
        ->assertJsonPath('bridge_message', 'login_in_progress');
});

it('từ chối tài khoản Zalo đã gắn vào hộp thư khác và chỉ rõ hộp thư nào', function () {
    fakeZaloBridge();
    $other = Inbox::factory()->zalo()->create(['account_id' => $this->account->id, 'name' => 'Zalo bán sỉ']);
    $other->channel->update(['zalo_uid' => '1234567890', 'state' => Zalo::STATE_CONNECTED]);
    $this->channel->update(['qr_token' => 'token-1']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/promote")
        ->assertStatus(409)
        ->assertJsonPath('error_code', 'zalo_account_in_use')
        ->assertJsonPath('inbox_name', 'Zalo bán sỉ');

    expect($this->channel->refresh()->state)->not->toBe(Zalo::STATE_CONNECTED)
        ->and($this->channel->qr_token)->toBeNull();

    // Slot vừa nối phải được đăng xuất, nếu không listener mới đá phiên hộp thư kia.
    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout'));
});

it('lấy avatar tài khoản Zalo làm ảnh đại diện mặc định của hộp thư', function () {
    Queue::fake();
    fakeZaloBridge();
    $this->channel->update(['qr_token' => 'token-1']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/promote")
        ->assertOk();

    Queue::assertPushed(AvatarFromUrlJob::class);
});

it('ngắt kết nối: đăng xuất bridge rồi hạ trạng thái', function () {
    fakeZaloBridge();
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890', 'qr_token' => 'token-1']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/disconnect")
        ->assertOk()
        ->assertJsonPath('state', Zalo::STATE_DISCONNECTED)
        ->assertJsonPath('bridge_reachable', true);

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_DISCONNECTED)
        ->and($this->channel->qr_token)->toBeNull()
        // Giữ danh tính cũ để màn cấu hình còn nói được từng gắn tài khoản nào.
        ->and($this->channel->zalo_uid)->toBe('1234567890');

    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout'));
});

it('ngắt kết nối vẫn xong khi bridge chết, nhưng nói rõ là bridge không trả lời', function () {
    Http::fake(fn () => throw new ConnectionException('refused'));
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/disconnect")
        ->assertOk()
        ->assertJsonPath('bridge_reachable', false);

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_DISCONNECTED);
});

it('sau khi ngắt kết nối thì quét được tài khoản Zalo khác', function () {
    fakeZaloBridge();
    $this->channel->update([
        'state' => Zalo::STATE_DISCONNECTED,
        'zalo_uid' => '999',
        'qr_token' => 'token-1',
    ]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}/zalo/promote")
        ->assertOk();

    expect($this->channel->refresh()->zalo_uid)->toBe('1234567890')
        ->and($this->channel->state)->toBe(Zalo::STATE_CONNECTED);
});

it('xoá hộp thư Zalo thì đăng xuất slot ở bridge', function () {
    fakeZaloBridge();
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890', 'qr_token' => 'token-1']);
    $connectionId = $this->channel->connectionId();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}")
        ->assertOk();

    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/logout')
        && (int) $request['connection_id'] === $connectionId);
    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/qr/cancel'));
    expect(Zalo::query()->find($connectionId))->toBeNull();
});

it('xoá hộp thư Zalo vẫn xong khi bridge chết', function () {
    Http::fake(fn () => throw new ConnectionException('refused'));
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890']);
    $connectionId = $this->channel->connectionId();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}")
        ->assertOk();

    expect(Zalo::query()->find($connectionId))->toBeNull();
});

it('mất phiên là hộp thư báo cần đăng nhập lại ở mọi nơi', function () {
    fakeZaloBridge();
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890']);

    expect($this->inbox->fresh()->reauthorizationRequired())->toBeFalse();

    // Webhook bridge báo mất phiên.
    zaloSessionWebhook($this->channel->connectionId(), 'session_lost', 'ws_closed_1006')->assertOk();

    $this->channel->refresh();
    $inbox = $this->inbox->fresh();

    expect($this->channel->state)->toBe(Zalo::STATE_SESSION_LOST)
        ->and($this->channel->session_lost_reason)->toBe('ws_closed_1006')
        ->and($inbox->reauthorizationRequired())->toBeTrue();

    // Trang cấu hình inbox (InboxResource) và sidebar (SetCurrentAccount) cùng thấy.
    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$this->inbox->id}")
        ->assertOk()
        ->assertJsonPath('reauthorization_required', true)
        ->assertJsonPath('zalo_state', Zalo::STATE_SESSION_LOST);
});

it('webhook bridge báo phiên sống lại thì mở luôn mạch ngắt', function () {
    fakeZaloBridge();
    $this->channel->update(['state' => Zalo::STATE_SESSION_LOST, 'zalo_uid' => '1234567890']);
    $monitor = app(ZaloHealthMonitor::class);
    for ($i = 0; $i < 5; $i++) {
        $monitor->recordError($this->channel->connectionId(), 'session_lost');
    }

    zaloSessionWebhook($this->channel->connectionId(), 'session_ok')->assertOk();

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED)
        ->and($monitor->errorCount($this->channel->connectionId()))->toBe(0);
});

it('bridge hỏng ba nhịp liên tiếp mới hạ trạng thái kênh', function () {
    Http::fake(['127.0.0.1:3710/health*' => Http::response(['ok' => true, 'connected' => false, 'phase' => 'session_lost'])]);
    $this->channel->update(['state' => Zalo::STATE_CONNECTED, 'zalo_uid' => '1234567890']);
    $connectionId = $this->channel->connectionId();

    app(ZaloHealthSweepJob::class, ['connectionId' => $connectionId])->handle(
        app(ZaloBridgeClient::class),
        app(ZaloHealthMonitor::class),
    );
    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED);

    foreach ([2, 3] as $ignored) {
        app(ZaloHealthSweepJob::class, ['connectionId' => $connectionId])->handle(
            app(ZaloBridgeClient::class),
            app(ZaloHealthMonitor::class),
        );
    }

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_SESSION_LOST)
        ->and($this->channel->session_lost_reason)->toBe('bridge_slot_session_lost')
        ->and($this->inbox->fresh()->reauthorizationRequired())->toBeTrue();
});

it('bridge sống lại thì nhịp tim tự đưa kênh về connected', function () {
    Http::fake(['127.0.0.1:3710/health*' => Http::response(['ok' => true, 'connected' => true, 'phase' => 'ready'])]);
    $this->channel->update(['state' => Zalo::STATE_SESSION_LOST, 'zalo_uid' => '1234567890']);

    app(ZaloHealthSweepJob::class, ['connectionId' => $this->channel->connectionId()])->handle(
        app(ZaloBridgeClient::class),
        app(ZaloHealthMonitor::class),
    );

    expect($this->channel->refresh()->state)->toBe(Zalo::STATE_CONNECTED);
});

it('ngắt mạch có half-open: hết cửa sổ chờ thì cho thử lại', function () {
    $monitor = app(ZaloHealthMonitor::class);
    $connectionId = $this->channel->connectionId();

    for ($i = 0; $i < 5; $i++) {
        $monitor->recordError($connectionId, '429');
    }

    expect($monitor->isCircuitOpen($connectionId))->toBeTrue()
        ->and($monitor->status($connectionId)['status'])->toBe('open')
        ->and($monitor->status($connectionId)['retry_at'])->not->toBeNull();

    $this->travel((int) config('zalo.circuit_breaker.half_open_seconds', 300) + 5)->seconds();

    // Một lượt thử được đi qua, nhưng lượt ngay sau lại chặn để không thử dồn dập.
    expect($monitor->isCircuitOpen($connectionId))->toBeFalse()
        ->and($monitor->isCircuitOpen($connectionId))->toBeTrue();
});

it('bước quét QR có URL riêng nên F5 không tạo thêm hộp thư', function () {
    $before = Inbox::query()->where('channel_type', 'Channel::Zalo')->count();

    // Mở lại đúng URL bước QR bao nhiêu lần cũng chỉ trỏ vào hộp thư đã tạo —
    // trước đây bước này chỉ sống trong state React nên F5 rơi về bước 1 và tạo
    // hộp thư mồ côi (bằng chứng: inbox 58 trùng tên inbox 59 trong DB dev).
    foreach ([1, 2] as $ignored) {
        $this->actingAs($this->admin)
            ->get("/app/accounts/{$this->account->id}/settings/inboxes/new/{$this->inbox->id}/zalo")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/settings/inboxes/channels/ZaloConnect')
                ->where('inboxId', $this->inbox->id));
    }

    expect(Inbox::query()->where('channel_type', 'Channel::Zalo')->count())->toBe($before);
});

it('không cho mở bước QR của hộp thư thuộc account khác', function () {
    $otherAccount = Account::factory()->create();
    $otherInbox = Inbox::factory()->zalo()->create(['account_id' => $otherAccount->id]);

    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/settings/inboxes/new/{$otherInbox->id}/zalo")
        ->assertNotFound();
});
