<?php

use App\Models\SuperAdmin;
use App\Models\SuperAdminImpersonation;
use App\Models\User;

// Đăng nhập hộ bắt buộc lý do và ghi nhật ký; GET không còn hoạt động.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
});

it('từ chối khi thiếu lý do', function () {
    $target = User::factory()->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->post("/super_admin/users/{$target->id}/impersonate", [])
        ->assertSessionHasErrors('reason');

    expect(SuperAdminImpersonation::query()->count())->toBe(0);
});

it('từ chối lý do quá ngắn', function () {
    $target = User::factory()->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->post("/super_admin/users/{$target->id}/impersonate", ['reason' => 'ngan qua'])
        ->assertSessionHasErrors('reason');
});

it('GET không còn hoạt động (405)', function () {
    $target = User::factory()->create();

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get("/super_admin/users/{$target->id}/impersonate")
        ->assertStatus(405);
});

it('ghi nhật ký kèm token khi có lý do hợp lệ và trỏ tới /app/login', function () {
    $target = User::factory()->create();

    $response = $this->actingAs($this->superAdmin, 'super_admin')
        ->post("/super_admin/users/{$target->id}/impersonate", ['reason' => 'điều tra sự cố khách báo lỗi']);

    $response->assertRedirect();
    expect($response->headers->get('Location'))->toContain('/app/login')
        ->and($response->headers->get('Location'))->toContain('impersonation=true');

    $log = SuperAdminImpersonation::query()->sole();
    expect($log->super_admin_id)->toBe($this->superAdmin->id)
        ->and($log->target_user_id)->toBe($target->id)
        ->and($log->reason)->toBe('điều tra sự cố khách báo lỗi')
        ->and($log->used_at)->toBeNull()
        ->and($log->token_hash)->not->toBeEmpty();
});

// Tách riêng khỏi test tạo nhật ký ở trên: dựng token/nhật ký trực tiếp qua
// model rồi chỉ gọi một request duy nhất tới /app/login, để không lẫn hiệu ứng
// phụ của việc chạy nhiều request auth:super_admin rồi auth:web liên tiếp
// trong cùng tiến trình test (Laravel test client tái dùng chung container).
it('đánh dấu used_at và mở đúng phiên guard web khi tiêu thụ token SSO', function () {
    $target = User::factory()->create();
    $token = $target->generateSsoAuthToken(impersonation: true);

    $log = SuperAdminImpersonation::query()->create([
        'super_admin_id' => $this->superAdmin->id,
        'target_user_id' => $target->id,
        'reason' => 'điều tra sự cố khách báo lỗi',
        'token_hash' => hash('sha256', $token),
    ]);

    $this->post('/app/login', [
        'email' => $target->email,
        'sso_auth_token' => $token,
    ])->assertRedirect('/app');

    expect(auth()->guard('web')->id())->toBe($target->id)
        ->and($log->refresh()->used_at)->not->toBeNull();
});

it('liệt kê nhật ký đăng nhập hộ trong console, lọc theo super admin', function () {
    $target = User::factory()->create();
    $this->actingAs($this->superAdmin, 'super_admin')
        ->post("/super_admin/users/{$target->id}/impersonate", ['reason' => 'điều tra sự cố khách báo lỗi']);

    $otherAdmin = SuperAdmin::factory()->create();
    $otherTarget = User::factory()->create();
    SuperAdminImpersonation::query()->create([
        'super_admin_id' => $otherAdmin->id,
        'target_user_id' => $otherTarget->id,
        'reason' => 'lý do khác để kiểm tra bộ lọc',
        'token_hash' => hash('sha256', 'khac'),
    ]);

    $response = $this->actingAs($this->superAdmin, 'super_admin')
        ->get("/super_admin/impersonations?super_admin_id={$this->superAdmin->id}")
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('superadmin/resource/Index')
        ->where('pagination.total', 1),
    );
});
