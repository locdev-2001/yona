<?php

use App\Models\SuperAdmin;
use App\Models\User;

// /horizon, /pulse và /log-viewer đọc payload job, URI request và toàn bộ log
// (nội dung tin nhắn khách, số điện thoại, payload webhook Zalo). Ba dashboard
// này do gói ngoài đăng ký route nên không nằm trong routes/web.php — test này
// là chỗ duy nhất chặn việc nâng cấp gói làm hở guard.
$dashboards = ['/horizon', '/pulse', '/log-viewer'];

it('bắt khách lạ đăng nhập console quản trị', function (string $path) {
    $this->get($path)->assertRedirect('/super_admin/sign_in');
})->with($dashboards);

it('không cho agent thường vào dù đã đăng nhập', function (string $path) {
    $this->actingAs(User::factory()->create())
        ->get($path)
        ->assertRedirect('/super_admin/sign_in');
})->with($dashboards);

it('cho super admin đã bật 2FA vào', function (string $path) {
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin')
        ->get($path)
        ->assertOk();
})->with($dashboards);

it('chặn super admin chưa bật 2FA khi bắt buộc 2FA', function (string $path) {
    config(['yona.super_admin_require_mfa' => true]);

    $this->actingAs(SuperAdmin::factory()->create(), 'super_admin')
        ->get($path)
        ->assertForbidden();
})->with($dashboards);

it('không cho xoá file log qua giao diện', function () {
    expect(Gate::forUser(SuperAdmin::factory()->create())->allows('deleteLogFile'))->toBeFalse();
});

it('giữ đúng thứ tự tier khi Horizon nuôi worker', function () {
    $supervisor = config('horizon.defaults.supervisor-1');

    expect($supervisor['queue'])->toBe(require config_path('queue_tiers.php'))
        ->and($supervisor['balance'])->toBeFalse()
        ->and($supervisor['timeout'])->toBeLessThan(config('queue.connections.redis.retry_after'));
});
