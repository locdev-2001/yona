<?php

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\InstallationConfig;
use App\Models\PlatformApp;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

// Port từ refs/chatwoot/spec/controllers/super_admin/*_controller_spec.rb —
// các màn Administrate của console quản trị.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->create();
    $this->actingAs($this->superAdmin, 'super_admin');
});

it('liệt kê account kèm cột đếm', function () {
    $account = Account::factory()->create(['name' => 'Acme Inc']);
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => User::factory()->create()->id]);

    $this->get('/super_admin/accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/resource/Index')
            ->where('rows.0.cells.1.value', 'Acme Inc')
            ->where('rows.0.cells.3.value', 1),
        );
});

it('lọc account theo bộ lọc suspended', function () {
    Account::factory()->create(['name' => 'Đang chạy']);
    Account::factory()->create(['name' => 'Bị khoá', 'status' => Account::STATUS_SUSPENDED]);

    $this->get('/super_admin/accounts?search=suspended%3A')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('rows', fn ($rows) => count($rows) === 1));
});

it('tìm account theo tên', function () {
    Account::factory()->create(['name' => 'Alpha']);
    Account::factory()->create(['name' => 'Beta']);

    $this->get('/super_admin/accounts?search=Alph')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('rows.0.cells.1.value', 'Alpha')
            ->where('rows', fn ($rows) => count($rows) === 1));
});

it('trang show account có account_users và nút hành động', function () {
    $account = Account::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => User::factory()->create()->id]);

    $this->get("/super_admin/accounts/{$account->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/resource/Show')
            ->where('record.title', "#{$account->id} {$account->name}")
            ->has('accountUserForm')
            ->where('fields.8.type', 'has_many'),
        );
});

it('đình chỉ account bắt buộc lý do và ghi lịch sử', function () {
    $account = Account::factory()->create();

    $this->put("/super_admin/accounts/{$account->id}", ['account' => ['status' => 'suspended']])
        ->assertSessionHasErrors();

    $this->put("/super_admin/accounts/{$account->id}", ['account' => [
        'status' => 'suspended',
        'suspension_category' => 'spam',
        'suspension_reason' => 'Gửi thư rác',
    ]])->assertRedirect("/super_admin/accounts/{$account->id}");

    $account->refresh();

    expect($account->status)->toBe(Account::STATUS_SUSPENDED)
        ->and($account->internal_attributes['suspensions'][0]['category'])->toBe('spam');
});

it('không xoá account ngay mà đẩy job nền', function () {
    Queue::fake();
    $account = Account::factory()->create();

    $this->delete("/super_admin/accounts/{$account->id}")->assertRedirect('/super_admin/accounts');

    Queue::assertPushed(DeleteObjectJob::class);
    expect(Account::query()->find($account->id))->not->toBeNull();
});

it('cập nhật user giữ nguyên mật khẩu khi bỏ trống', function () {
    $user = User::factory()->create(['name' => 'Cũ']);
    $hash = $user->password;

    $this->put("/super_admin/users/{$user->id}", ['user' => ['name' => 'Mới', 'password' => '']])
        ->assertRedirect("/super_admin/users/{$user->id}");

    $user->refresh();

    expect($user->name)->toBe('Mới')->and($user->password)->toBe($hash);
});

it('nâng user lên super admin từ biểu mẫu', function () {
    $user = User::factory()->create();

    $this->put("/super_admin/users/{$user->id}", ['user' => ['type' => SuperAdmin::TYPE]]);

    expect($user->fresh()->type)->toBe(SuperAdmin::TYPE);
});

it('gửi lại thư xác nhận cho user chưa xác nhận', function () {
    Notification::fake();
    $user = User::factory()->unconfirmed()->create();

    $this->post("/super_admin/users/{$user->id}/resend_confirmation")->assertRedirect();

    Notification::assertSentTo($user, ConfirmationInstructions::class);
});

it('tạo platform app kèm access token và xem lại token', function () {
    $this->post('/super_admin/platform_apps', ['platform_app' => ['name' => 'App tích hợp']])
        ->assertRedirect();

    $platformApp = PlatformApp::query()->firstOrFail();

    expect($platformApp->accessToken)->not->toBeNull();

    $this->get("/super_admin/platform_apps/{$platformApp->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('fields.4.value.fields.0.value', $platformApp->accessToken->token));
});

it('gắn người dùng vào account từ trang show', function () {
    $account = Account::factory()->create();
    $user = User::factory()->create();

    $this->post('/super_admin/account_users', ['account_user' => [
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => 'administrator',
    ]])->assertRedirect();

    expect(AccountUser::query()->where('account_id', $account->id)->first()->role)
        ->toBe(AccountUser::ROLE_ADMINISTRATOR);
});

it('chỉ hiện installation config chưa khoá', function () {
    InstallationConfig::query()->create(['name' => 'LOCKED_ONE', 'value' => 'a', 'locked' => true]);
    InstallationConfig::query()->create(['name' => 'OPEN_ONE', 'value' => 'b', 'locked' => false]);

    $this->get('/super_admin/installation_configs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('rows', fn ($rows) => count($rows) === 1)
            ->where('rows.0.cells.1.value', 'OPEN_ONE'));
});

it('lưu app config vào installation_configs', function () {
    $this->post('/super_admin/app_config', [
        'config' => 'general',
        'app_config' => ['WEBHOOK_TIMEOUT' => '15', 'KHONG_DUOC_PHEP' => 'x'],
    ])->assertRedirect('/super_admin/settings');

    expect(InstallationConfig::valueOf('WEBHOOK_TIMEOUT'))->toBe('15')
        ->and(InstallationConfig::query()->where('name', 'KHONG_DUOC_PHEP')->exists())->toBeFalse();
});

it('liệt kê access token theo chủ sở hữu', function () {
    AgentBot::factory()->create();

    $this->get('/super_admin/access_tokens?search=agent_bot%3A')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('rows', fn ($rows) => count($rows) === 1));
});

it('trang dashboard trả số liệu qua JSON', function () {
    Account::factory()->create();

    $this->getJson('/super_admin')
        ->assertOk()
        ->assertJsonStructure(['chartData', 'accountsCount', 'usersCount', 'inboxesCount', 'conversationsCount']);
});

it('impersonate chuyển sang link sso', function () {
    $user = User::factory()->create();

    $response = $this->get("/super_admin/users/{$user->id}/impersonate");

    expect($response->headers->get('Location'))->toContain('impersonation=true');
});

it('biểu mẫu account có trường lý do đình chỉ phụ thuộc trạng thái', function () {
    $account = Account::factory()->create();

    $this->get("/super_admin/accounts/{$account->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/resource/Form')
            ->where('fields.3.name', 'suspension_category')
            ->where('fields.3.options', ['spam', 'non_payment', 'other'])
            ->where('fields.3.depends_on', ['field' => 'status', 'value' => 'suspended'])
            ->where('fields.4.label', 'Suspension reason'),
        );
});
