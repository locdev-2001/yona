<?php

use App\Models\SuperAdmin;
use App\Models\User;

// /horizon, /pulse và /logs đọc payload job, URI request và toàn bộ log
// (nội dung tin nhắn khách, số điện thoại, payload webhook Zalo). Ba dashboard
// này do gói ngoài đăng ký route nên không nằm trong routes/web.php — test này
// là chỗ duy nhất chặn việc nâng cấp gói làm hở guard.
$dashboards = ['/horizon', '/pulse', '/logs', 'API log viewer' => '/logs/api/folders'];

const SYSTEM_ADMIN_EMAIL = 'van-hanh@yona.vn';

beforeEach(fn () => config(['yona.system_admin_emails' => SYSTEM_ADMIN_EMAIL]));

it('bắt khách lạ đăng nhập console quản trị', function (string $path) {
    $this->get($path)->assertRedirect('/super_admin/sign_in');
})->with($dashboards);

it('trả 401 cho khách lạ gọi API log viewer', function () {
    $this->getJson('/logs/api/folders')->assertUnauthorized();
});

it('không cho agent thường không có email hệ thống vào', function (string $path) {
    $this->actingAs(User::factory()->create())
        ->get($path)
        ->assertForbidden();
})->with($dashboards);

it('cho user có email hệ thống vào dù chưa bật 2FA', function (string $path) {
    $systemAdmin = User::factory()->create(['email' => SYSTEM_ADMIN_EMAIL]);

    expect($systemAdmin->mfaEnabled())->toBeFalse();

    $this->actingAs($systemAdmin)
        ->get($path)
        ->assertOk();
})->with($dashboards);

it('cho super admin đã bật 2FA vào', function (string $path) {
    $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin')
        ->get($path)
        ->assertOk();
})->with($dashboards);

it('đưa super admin chưa bật 2FA vào màn cài đặt thay vì cho vào dashboard', function (string $path) {
    $this->actingAs(SuperAdmin::factory()->create(), 'super_admin')
        ->get($path)
        ->assertRedirect('/super_admin/mfa/setup');
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
