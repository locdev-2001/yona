<?php

use App\Support\WidgetEmbedScript;

// Khung chat trên landing là hộp thư website thật của account Yona. Máy dev hay
// staging mà nhúng nó thì mỗi lần nhắn thử là một hội thoại rác trên production,
// nên địa chỉ và token đi theo cấu hình của từng bản cài đặt.

dataset('trang công khai', [
    'trang chủ' => fn () => route('home'),
    'trang Zalo cá nhân' => fn () => route('channels.zalo_personal'),
    'trang đặt lịch demo' => fn () => route('demo_request.create'),
    'trang điều khoản' => fn () => route('legal.terms'),
]);

it('không nhúng widget khi cài đặt không có token', function (string $url) {
    config(['yona.landing_widget.token' => null]);

    $this->get($url)
        ->assertOk()
        ->assertDontSee('/packs/js/sdk.js', escape: false)
        ->assertDontSee('websiteToken', escape: false)
        ->assertDontSee('https://yona.vn/packs', escape: false);
})->with('trang công khai');

it('nhúng widget trỏ đúng địa chỉ và token của cài đặt', function (string $url) {
    config([
        'yona.landing_widget.base_url' => 'https://chat.example.test',
        'yona.landing_widget.token' => 'token-widget-landing',
    ]);

    $this->get($url)
        ->assertOk()
        ->assertSee('var BASE_URL="https://chat.example.test";', escape: false)
        ->assertSee("websiteToken: 'token-widget-landing',", escape: false)
        ->assertSee(WidgetEmbedScript::render('https://chat.example.test', 'token-widget-landing'), escape: false);
})->with('trang công khai');

it('mặc định cho widget nói chuyện với chính bản cài đặt đang phục vụ trang', function () {
    expect(config('yona.landing_widget.base_url'))->toBe(rtrim((string) config('app.url'), '/'));
})->skip(fn () => filled(env('LANDING_WIDGET_BASE_URL')), 'LANDING_WIDGET_BASE_URL đang được đặt trong môi trường');
