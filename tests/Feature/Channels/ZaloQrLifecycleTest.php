<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Zalo\ZaloHealthMonitor;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

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
        ]),
        '127.0.0.1:3710/*' => Http::response(['ok' => true]),
        ...$overrides,
    ]);
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
        ->assertStatus(503)
        ->assertJsonPath('ok', false);
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
