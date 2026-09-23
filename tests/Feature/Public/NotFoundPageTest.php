<?php

// Hai mặt của cùng một lỗi: người lạc đường trên web cần trang có lối về, còn
// client API (widget, app di động, Platform API) cần JSON đọc được. Trang HTML
// trả cho một lời gọi API là thứ làm widget chết không báo lỗi gì.

// Dấu mà deploy.sh dò để biết nginx có đang đè trang 404 của Laravel hay không.
const NOT_FOUND_PAGE_MARKER = 'data-page="not_found"';

it('trả trang 404 có thương hiệu cho đường dẫn web không tồn tại', function () {
    app()->setLocale('vi');

    $response = $this->get('/duong-dan-khong-ton-tai')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'text/html; charset=utf-8')
        ->assertSee(NOT_FOUND_PAGE_MARKER, escape: false)
        ->assertSee('<title>Không tìm thấy trang · Yona</title>', escape: false);

    preg_match('/window\.landingConfig = (.*?);\s*<\/script>/s', (string) $response->getContent(), $khop);
    $config = json_decode($khop[1], true, flags: JSON_THROW_ON_ERROR);

    expect($config['page'])->toBe('not_found')
        ->and($config['notFound']['home'])->toBe('Về trang chủ')
        ->and($config['urls']['home'])->toBe(route('home'))
        ->and($config['urls']['login'])->toBe(route('login'));
});

// Đúng hai dạng URL mà deploy.sh dò để biết rule ảnh tĩnh của nginx có nuốt
// route Laravel đuôi ảnh hay không: tệp đính kèm và pixel đếm lượt xem Help Center.
it('dùng cùng trang 404 khi route khớp nhưng bản ghi không có', function (string $path) {
    $this->get($path)
        ->assertNotFound()
        ->assertSee(NOT_FOUND_PAGE_MARKER, escape: false);
})->with([
    'tệp đính kèm' => '/attachments/0/khong-co-chu-ky/anh.jpg',
    'pixel Help Center' => '/hc/khong-co-portal/articles/khong-co-bai.png',
]);

it('trả JSON 404 cho mặt tiền API', function (string $path) {
    $this->get($path)
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertExactJson(['error' => 'Resource could not be found']);
})->with([
    'api' => '/api/v1/khong-ton-tai',
    'public api' => '/public/api/v1/khong-ton-tai',
]);

it('trả JSON khi client web xin JSON', function () {
    $this->getJson('/duong-dan-khong-ton-tai')
        ->assertNotFound()
        ->assertExactJson(['error' => 'Resource could not be found']);
});

it('dịch trang 404 theo ngôn ngữ đang dùng', function () {
    app()->setLocale('en');

    $this->get('/duong-dan-khong-ton-tai')
        ->assertNotFound()
        ->assertSee('<title>Page not found · Yona</title>', escape: false);
});

// Trang 404 cũng là trang lỗi của Help Center và link khảo sát của tenant: khách
// của tenant không được thấy khung chat của Yona, và bot không được lập chỉ mục nó.
it('không nhúng widget chat của Yona và không cho lập chỉ mục trang 404', function () {
    $this->get('/duong-dan-khong-ton-tai')
        ->assertNotFound()
        ->assertSee('<meta name="robots" content="noindex, follow">', escape: false)
        ->assertDontSee('rel="canonical"', escape: false)
        ->assertDontSee('chatwootSDK', escape: false);
});

it('vẫn nhúng widget chat của Yona trên trang chủ', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertSee('chatwootSDK', escape: false)
        ->assertSee('rel="canonical"', escape: false);
});
