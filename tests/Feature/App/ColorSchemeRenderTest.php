<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Chế độ màu của portal phải có ngay trong HTML trả về, để trang không nháy nền sáng
// trước khi React chạy; trang đăng nhập là bề mặt công khai nên luôn sáng.
function portalHtmlFor(array $uiSettings): string
{
    $user = User::factory()->create(['ui_settings' => $uiSettings]);
    $account = Account::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

    return test()->actingAs($user)->get("/app/accounts/{$account->id}/profile/settings")->assertOk()->getContent();
}

describe('chế độ màu khi render portal', function () {
    it('đặt class dark trên <html> khi nhân viên chọn Tối', function () {
        $html = portalHtmlFor(['color_scheme' => 'dark']);

        expect($html)->toContain('class="dark"')->toContain('color-scheme: dark');
    });

    it('mặc định sáng khi chưa chọn hoặc giá trị lạ', function (array $uiSettings) {
        $html = portalHtmlFor($uiSettings);

        expect($html)->toContain('color-scheme: light')->not->toContain('class="dark"');
    })->with([
        'chưa chọn' => [[]],
        'sáng' => [['color_scheme' => 'light']],
        'giá trị lạ' => [['color_scheme' => 'system']],
    ]);

    it('trang đăng nhập luôn sáng', function () {
        $this->get('/app/login')->assertOk()->assertSee('color-scheme: light', false)->assertDontSee('class="dark"', false);
    });
});
