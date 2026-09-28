<?php

use App\Models\User;
use App\Support\SystemAccess;

// Quyền hệ thống = email user nằm trong YONA_SYSTEM_ADMIN_EMAILS.

it('nhận email trong danh sách, bỏ khoảng trắng, không phân biệt hoa thường', function () {
    config(['yona.system_admin_emails' => ' Chu@Yona.vn , ops@yona.vn,,']);

    expect(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'chu@yona.vn'])))->toBeTrue()
        ->and(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'OPS@YONA.VN '])))->toBeTrue()
        ->and(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'khach@shop.vn'])))->toBeFalse()
        ->and(SystemAccess::systemAdminEmails())->toBe(['chu@yona.vn', 'ops@yona.vn']);
});

it('danh sách rỗng hay chưa đặt thì không ai có quyền', function (?string $configured) {
    config(['yona.system_admin_emails' => $configured]);

    expect(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'chu@yona.vn'])))->toBeFalse()
        ->and(SystemAccess::systemAdminEmails())->toBe([]);
})->with(['chuỗi rỗng' => '', 'chỉ dấu phẩy' => ' , ', 'null' => null]);

it('không có user hoặc user không có email thì không có quyền', function () {
    config(['yona.system_admin_emails' => 'chu@yona.vn']);

    expect(SystemAccess::isSystemAdmin(null))->toBeFalse()
        ->and(SystemAccess::isSystemAdmin(User::factory()->make(['email' => ''])))->toBeFalse();
});

it('không khớp một phần email', function () {
    config(['yona.system_admin_emails' => 'chu@yona.vn']);

    expect(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'chu@yona.vn.evil'])))->toBeFalse()
        ->and(SystemAccess::isSystemAdmin(User::factory()->make(['email' => 'xchu@yona.vn'])))->toBeFalse();
});
