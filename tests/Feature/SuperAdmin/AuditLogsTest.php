<?php

use App\Models\Account;
use App\Models\SuperAdmin;
use App\Models\SuperAdminAuditLog;
use App\Models\User;
use App\Services\Admin\Operations\SensitiveFields;

// Nhật ký thao tác: mọi request ghi của console để lại một dòng, bí mật đã che.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create(['email' => 'ops@yona.vn']);
    $this->actingAs($this->superAdmin, 'super_admin');
});

it('ghi lại thao tác khoá account kèm đối tượng, người làm và kết quả', function () {
    $account = Account::factory()->create();

    $this->post("/admin/accounts/{$account->id}/suspend", ['category' => 'spam', 'reason' => 'Rác'])->assertRedirect();

    $log = SuperAdminAuditLog::query()->sole();
    expect($log->action)->toBe('POST accounts/{id}/suspend')
        ->and($log->subject_type)->toBe('accounts')
        ->and($log->subject_id)->toBe($account->id)
        ->and($log->super_admin_id)->toBe($this->superAdmin->id)
        ->and($log->super_admin_email)->toBe('ops@yona.vn')
        ->and($log->response_status)->toBe(302)
        ->and($log->changes)->toEqualCanonicalizing(['category' => 'spam', 'reason' => 'Rác']);
});

it('không bao giờ lưu mật khẩu hay token trong nhật ký', function () {
    $user = User::factory()->create();

    $this->put("/admin/users/{$user->id}", ['user' => ['name' => 'Tên mới', 'password' => 'Mat-khau-moi-123!', 'access_token' => 'abc']]);

    $log = SuperAdminAuditLog::query()->sole();
    expect($log->changes['user'])->toMatchArray(['name' => 'Tên mới', 'password' => SensitiveFields::MASK, 'access_token' => SensitiveFields::MASK])
        ->and(json_encode($log->changes))->not->toContain('Mat-khau-moi')
        ->and($log->changes)->not->toHaveKey('_token');
});

it('không ghi request đọc', function () {
    $this->get('/admin/accounts')->assertOk();
    $this->getJson('/admin/api/search?q=abc')->assertOk();

    expect(SuperAdminAuditLog::query()->count())->toBe(0);
});

it('trang nhật ký lọc theo đối tượng và hành động', function () {
    $account = Account::factory()->create();
    $this->post("/admin/accounts/{$account->id}/suspend", ['category' => 'spam', 'reason' => 'Rác']);
    $this->post("/admin/accounts/{$account->id}/unsuspend");
    $this->post("/admin/accounts/{$account->id}/reset_cache");

    $this->get("/admin/audit_logs?subject_type=accounts&subject_id={$account->id}&action=suspend")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/AuditLogs', false)
            ->has('logs', 2)
            ->where('logs.0.action', 'POST accounts/{id}/unsuspend')
            ->where('logs.0.subjectUrl', "/admin/accounts/{$account->id}/overview")
            ->where('pagination.total', 2)
            ->where('options.subjectTypes', ['accounts'])
            ->where('options.superAdmins.0.label', 'ops@yona.vn'),
        );
});

it('account 360 hiện thao tác của quản trị viên trên dòng thời gian', function () {
    $account = Account::factory()->create();
    $this->post("/admin/accounts/{$account->id}/reset_cache");

    $this->get("/admin/accounts/{$account->id}/overview")
        ->assertInertia(fn ($page) => $page->where('timeline', fn ($timeline) => collect($timeline)->pluck('type')->contains('admin_action')));
});
