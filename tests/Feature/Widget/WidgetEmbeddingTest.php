<?php

use Tests\Support\WidgetSession;

// Trang /widget chỉ được nhúng trên "Tên miền được phép" của hộp thư website.

function widgetPageUrl(WidgetSession $session): string
{
    return route('widget', ['website_token' => $session->channel->website_token]);
}

it('không giới hạn nơi nhúng khi hộp thư chưa khai tên miền', function () {
    $session = WidgetSession::make(['allowed_domains' => '']);

    $this->get(widgetPageUrl($session))
        ->assertOk()
        ->assertHeaderMissing('Content-Security-Policy');
});

it('chỉ cho nhúng trên các tên miền được phép', function () {
    $session = WidgetSession::make(['allowed_domains' => 'shop.acme.vn,acme.vn']);

    $this->get(widgetPageUrl($session))
        ->assertOk()
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' shop.acme.vn acme.vn");
});

it('giữ tên miền con dạng *.domain, cổng và scheme, bỏ đường dẫn thừa', function () {
    $session = WidgetSession::make([
        'allowed_domains' => '*.acme.vn, https://shop.acme.vn/gio-hang?x=1 ,127.0.0.1:8699,acme.vn/,acme.vn',
    ]);

    $this->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' *.acme.vn https://shop.acme.vn 127.0.0.1:8699 acme.vn");
});

it('nhận danh sách phân tách bằng xuống dòng và chuyển tên miền có dấu sang punycode', function () {
    $session = WidgetSession::make(['allowed_domains' => "acme.vn\ncửahàng.vn"]);

    $this->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' acme.vn xn--cahng-tqa2694c.vn");
});

it('bỏ giá trị không phải tên miền để không chèn được chỉ thị CSP khác', function () {
    $session = WidgetSession::make(['allowed_domains' => "acme.vn,'unsafe-inline';script-src,https://,shop.acme.vn;sandbox"]);

    $this->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' acme.vn");
});

it('danh sách toàn giá trị hỏng thì chỉ cho chính Yona nhúng', function () {
    $session = WidgetSession::make(['allowed_domains' => ';;;']);

    $this->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
});

it('bật cờ WebView thì app di động (Origin rỗng, null, file://) nhúng được', function (?string $origin) {
    $session = WidgetSession::make([
        'allowed_domains' => 'acme.vn',
        'selected_feature_flags' => ['attachments', 'allow_mobile_webview'],
    ]);

    $this->withHeaders(array_filter(['Origin' => $origin]))
        ->get(widgetPageUrl($session))
        ->assertOk()
        ->assertHeaderMissing('Content-Security-Policy');
})->with([
    'không có Origin' => [null],
    'Origin null' => ['null'],
    'Origin file://' => ['file://'],
]);

it('bật cờ WebView nhưng request từ website vẫn bị giới hạn tên miền', function () {
    $session = WidgetSession::make([
        'allowed_domains' => 'acme.vn',
        'selected_feature_flags' => ['allow_mobile_webview'],
    ]);

    $this->withHeaders(['Origin' => 'https://la.example'])
        ->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' acme.vn");
});

it('không bật cờ WebView thì Origin null vẫn bị giới hạn tên miền', function () {
    $session = WidgetSession::make(['allowed_domains' => 'acme.vn']);

    $this->withHeaders(['Origin' => 'null'])
        ->get(widgetPageUrl($session))
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self' acme.vn");
});

it('website_token sai hoặc thiếu thì giữ trang như cũ, không gắn CSP', function (?string $websiteToken) {
    WidgetSession::make(['allowed_domains' => 'acme.vn']);

    $this->get(route('widget', array_filter(['website_token' => $websiteToken])))
        ->assertOk()
        ->assertHeaderMissing('Content-Security-Policy');
})->with([
    'token không khớp hộp thư nào' => ['token-khong-ton-tai'],
    'không có token' => [null],
]);
