<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Admin\Operations\AccountActivity;

// Account 360, khoá/mở nhanh và cột hoạt động của danh sách account. Dữ liệu
// dựng trước khi đăng nhập super admin: listener của model đọc người đang đăng nhập.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
    $this->asSuperAdmin = fn () => $this->actingAs($this->superAdmin, 'super_admin');
});

function operationsAccountMember(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

it('account 360 gom số liệu, thành viên, hộp thư, dòng thời gian và tiến độ kích hoạt', function () {
    $account = Account::factory()->create(['name' => 'Shop Hoa', 'custom_attributes' => ['onboarding_step' => 'invite_team']]);
    $owner = operationsAccountMember($account);
    Inbox::factory()->zalo()->create(['account_id' => $account->id, 'name' => 'Zalo chính']);
    Message::factory()->count(2)->create(['account_id' => $account->id]);
    Message::factory()->outgoing()->create(['account_id' => $account->id]);
    Message::factory()->create(['account_id' => $account->id, 'created_at' => now()->subDays(20)]);

    ($this->asSuperAdmin)()->get("/admin/accounts/{$account->id}/overview")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/AccountOverview', false)
            ->where('account.name', 'Shop Hoa')
            ->where('account.status', 'active')
            ->where('stats.users', 1)
            ->where('stats.messages7d', 3)
            ->where('stats.messages30d', 4)
            ->where('users.0.email', $owner->email)
            ->where('users.0.impersonateUrl', "/admin/users/{$owner->id}/impersonate")
            ->where('inboxes', fn ($inboxes) => collect($inboxes)->contains('inboxName', 'Zalo chính'))
            ->has('usage', AccountActivity::MONTH_MESSAGE_DAYS)
            ->where('usage', fn ($usage) => collect($usage)->sum('count') === 4)
            ->where('onboarding.step', 'invite_team')
            ->where('onboarding.milestones', fn ($milestones) => collect($milestones)->firstWhere('key', 'first_reply')['done'] === true
                && collect($milestones)->firstWhere('key', 'team_invited')['done'] === false)
            ->where('timeline', fn ($timeline) => collect($timeline)->pluck('type')->contains('inbox_created')
                && collect($timeline)->pluck('type')->contains('account_created'))
            ->where('urls.suspend', "/admin/accounts/{$account->id}/suspend")
            ->has('csrf'),
        );
});

it('account 360 trả 404 khi account không tồn tại', function () {
    ($this->asSuperAdmin)()->get('/admin/accounts/999999/overview')->assertNotFound();
});

it('khoá account bắt buộc nhóm lý do hợp lệ và lý do', function () {
    $account = Account::factory()->create();

    ($this->asSuperAdmin)()->post("/admin/accounts/{$account->id}/suspend", ['category' => 'khong-co', 'reason' => ''])
        ->assertSessionHasErrors(['category', 'reason']);

    expect($account->fresh()->isActive())->toBeTrue();
});

it('khoá rồi mở account, ghi lịch sử khoá', function () {
    $account = Account::factory()->create(['name' => 'Bán sỉ']);

    ($this->asSuperAdmin)()->from("/admin/accounts/{$account->id}/overview")
        ->post("/admin/accounts/{$account->id}/suspend", ['category' => 'spam', 'reason' => 'Gửi tin rác hàng loạt'])
        ->assertRedirect("/admin/accounts/{$account->id}/overview")
        ->assertSessionHas('notice');

    $account->refresh();
    expect($account->status)->toBe(Account::STATUS_SUSPENDED)
        ->and($account->internal_attributes['suspensions'][0])->toMatchArray(['category' => 'spam', 'reason' => 'Gửi tin rác hàng loạt']);

    $this->post("/admin/accounts/{$account->id}/unsuspend")->assertRedirect();

    expect($account->fresh()->isActive())->toBeTrue();
});

it('account đang khoá chặn agent cả trên trang lẫn API', function () {
    $account = Account::factory()->create(['status' => Account::STATUS_SUSPENDED]);
    $agent = operationsAccountMember($account);

    $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}/labels")
        ->assertForbidden()
        ->assertJson(['error' => 'Account is suspended']);
    $this->actingAs($agent)->get("/app/accounts/{$account->id}/dashboard")->assertForbidden();

    $account->update(['status' => Account::STATUS_ACTIVE]);
    $this->actingAs($agent)->getJson("/api/v1/accounts/{$account->id}/labels")->assertOk();
});

it('danh sách account có cột hoạt động, mở account 360 và lọc nguy cơ rời', function () {
    $quiet = Account::factory()->create(['name' => 'Im lặng', 'created_at' => now()->subDays(60)]);
    $busy = Account::factory()->create(['name' => 'Đông khách', 'created_at' => now()->subDays(60)]);
    Inbox::factory()->zalo()->create(['account_id' => $busy->id]);
    Message::factory()->create(['account_id' => $busy->id]);
    Account::factory()->create(['name' => 'Mới tạo']);

    ($this->asSuperAdmin)()->get('/admin/accounts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('columns', fn ($columns) => collect($columns)->pluck('name')->intersect(['inboxes', 'messages_7d', 'last_activity_at', 'created_at'])->count() === 4)
            ->where('rows', fn ($rows) => collect($rows)->pluck('url')->contains("/admin/accounts/{$busy->id}/overview")),
        );

    $this->get('/admin/accounts?search=churn_risk%3A')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rows', fn ($rows) => count($rows) === 1)
            ->where('rows.0.cells.1.value', 'Im lặng'),
        );

    expect($quiet->exists)->toBeTrue();
});
