<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Tests\Support\WidgetSession;

// Quét HTML thật máy chủ trả cho trình duyệt: bắt chỗ tên nền tảng cũ sinh lúc chạy
// (prop Inertia, cấu hình mặc định, mã nhúng) mà quét mã nguồn không thấy.
// Mẫu cần chặn trùng với LEGACY_BRAND_PATTERN của scripts/brand-leak-allowlist.mjs.
const LEGACY_BRAND_NEEDLES = ['chatwoot', 'chwt.app'];

function expectNoLegacyBrandName(string $html): void
{
    $lowered = mb_strtolower($html);

    foreach (LEGACY_BRAND_NEEDLES as $needle) {
        expect(str_contains($lowered, $needle))->toBeFalse("HTML còn chứa \"{$needle}\"");
    }
}

it('trang công khai không lộ tên nền tảng cũ', function (string $path) {
    $response = $this->get($path);

    expect($response->getStatusCode())->toBeIn([200, 404]);
    expectNoLegacyBrandName($response->getContent());
})->with([
    'trang chủ' => '/?locale=vi',
    'Zalo cá nhân' => '/zalo-ca-nhan?locale=vi',
    'điều khoản' => '/dieu-khoan?locale=vi',
    'chính sách riêng tư' => '/chinh-sach-rieng-tu?locale=vi',
    'đặt lịch demo' => '/dat-lich-demo?locale=vi',
    'đăng nhập' => '/app/login',
    'đăng ký' => '/app/auth/signup',
    'trang 404' => '/duong-dan-khong-ton-tai',
]);

it('file tĩnh trình duyệt tải về không lộ tên nền tảng cũ', function (string $file) {
    expectNoLegacyBrandName(file_get_contents(public_path($file)));
})->with(['sw.js', 'widget-test.html']);

it('trang chủ nhúng widget bằng tên SDK mới', function () {
    expect($this->get('/?locale=vi')->getContent())->toContain('window.yonaSDK.run({');
});

it('trang widget trong iframe không lộ tên nền tảng cũ', function () {
    $session = WidgetSession::make(['allowed_domains' => '']);

    $response = $this->get(route('widget', ['website_token' => $session->channel->website_token]))->assertOk();

    expectNoLegacyBrandName($response->getContent());
});

it('dashboard không đẩy khoá cờ tính năng mang tên cũ vào props', function () {
    $user = User::factory()->create();
    $account = Account::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);

    $response = $this->actingAs($user)->get("/app/accounts/{$account->id}/dashboard")->assertOk();

    expectNoLegacyBrandName($response->getContent());
});
