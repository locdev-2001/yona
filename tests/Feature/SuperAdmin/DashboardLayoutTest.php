<?php

use App\Models\SuperAdmin;
use App\Services\Admin\Metrics\DashboardLayout;

// Bố cục kéo thả của trang Tổng quan, lưu riêng cho từng super admin.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
    $this->actingAs($this->superAdmin, 'super_admin');
    $this->defaults = app(DashboardLayout::class)->defaults();
});

it('chưa lưu gì thì trả bố cục mặc định', function () {
    $this->getJson('/admin/api/dashboard/layout')
        ->assertOk()
        ->assertJsonPath('layout', $this->defaults);
});

it('lưu thứ tự, kích thước và ô ẩn cho riêng người đang đăng nhập', function () {
    $layout = [['key' => 'system', 'size' => 'full'], ['key' => 'kpis', 'size' => 'sm']];

    $this->putJson('/admin/api/dashboard/layout', ['layout' => $layout])
        ->assertOk()
        ->assertJsonPath('layout', $layout);

    $this->getJson('/admin/api/dashboard/layout')->assertJsonPath('layout', $layout);
    $this->get('/admin')->assertInertia(fn ($page) => $page->where('layout', $layout));

    $other = SuperAdmin::factory()->withMfa()->create();
    $this->actingAs($other, 'super_admin')
        ->getJson('/admin/api/dashboard/layout')
        ->assertJsonPath('layout', $this->defaults);
});

it('cho ẩn hết mọi ô', function () {
    $this->putJson('/admin/api/dashboard/layout', ['layout' => []])->assertOk()->assertJsonPath('layout', []);

    $this->getJson('/admin/api/dashboard/layout')->assertJsonPath('layout', []);
});

it('từ chối bố cục không hợp lệ', function (array $layout) {
    $this->putJson('/admin/api/dashboard/layout', ['layout' => $layout])->assertUnprocessable();
})->with([
    'ô lạ' => [[['key' => 'khong_co', 'size' => 'sm']]],
    'ô trùng' => [[['key' => 'kpis', 'size' => 'sm'], ['key' => 'kpis', 'size' => 'md']]],
    'kích thước lạ' => [[['key' => 'kpis', 'size' => 'xl']]],
    'thừa trường' => [[['key' => 'kpis', 'size' => 'sm', 'x' => 1]]],
]);

it('về mặc định mà vẫn giữ các thiết lập giao diện khác', function () {
    $this->superAdmin->forceFill(['ui_settings' => ['theme' => 'dark']])->save();
    $this->putJson('/admin/api/dashboard/layout', ['layout' => [['key' => 'kpis', 'size' => 'sm']]])->assertOk();

    $this->deleteJson('/admin/api/dashboard/layout')
        ->assertOk()
        ->assertJsonPath('layout', $this->defaults);

    expect($this->superAdmin->fresh()->ui_settings)->toBe(['theme' => 'dark']);
});

it('bỏ qua ô đã gỡ khỏi danh mục trong bố cục đã lưu', function () {
    $this->superAdmin->forceFill(['ui_settings' => [DashboardLayout::SETTINGS_KEY => [
        ['key' => 'o_da_go', 'size' => 'sm'],
        ['key' => 'kpis', 'size' => 'khong_hop_le'],
        ['key' => 'system', 'size' => 'md'],
    ]]])->save();

    $this->getJson('/admin/api/dashboard/layout')->assertJsonPath('layout', [['key' => 'system', 'size' => 'md']]);
});
