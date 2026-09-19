<?php

// Manifest sinh động theo cấu hình thương hiệu, và mọi icon nó khai báo phải
// tồn tại trong public/ — khai sai thì trình duyệt im lặng bỏ qua, không ai
// biết cho tới khi người dùng cài app về màn hình chính mà thấy icon rỗng.

it('serves the web app manifest from the branding config', function () {
    config([
        'yona.branding.installation_name' => 'Yona',
        'yona.branding.brand_name' => 'Yona',
        'yona.branding.theme_color' => '#041738',
    ]);

    $this->get('/site.webmanifest')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/manifest+json')
        ->assertJsonPath('name', 'Yona')
        ->assertJsonPath('short_name', 'Yona')
        ->assertJsonPath('theme_color', '#041738')
        ->assertJsonPath('display', 'standalone');
});

it('points every declared icon at a file that exists', function () {
    $icons = $this->get('/site.webmanifest')->json('icons');

    expect($icons)->not->toBeEmpty();

    foreach ($icons as $icon) {
        expect(public_path(ltrim($icon['src'], '/')))->toBeFile();
    }
})->group('brand-assets');

it('ships the icons and logos the blade layouts reference', function () {
    $referenced = [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'open-graph-1200x630.png',
        'twitter-x-card-1200x675.png',
        ltrim(config('yona.branding.logo'), '/'),
        ltrim(config('yona.branding.logo_dark'), '/'),
        ltrim(config('yona.branding.logo_thumbnail'), '/'),
    ];

    foreach ($referenced as $path) {
        expect(public_path($path))->toBeFile();
    }
})->group('brand-assets');
