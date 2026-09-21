<?php

it('serves sitemap.xml as xml', function () {
    $this->get('/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
});

it('lists every public marketing page', function () {
    $xml = $this->get('/sitemap.xml')->getContent();

    foreach (['home', 'channels.zalo_personal', 'demo_request.create'] as $name) {
        expect($xml)->toContain('<loc>'.route($name).'</loc>');
    }
});

// Bất biến thật của một sitemap: mọi URL khai ra phải mở được. Một URL 404 nằm
// trong sitemap làm Search Console báo lỗi cho cả site, không riêng URL đó.
it('only lists urls that answer 200', function () {
    preg_match_all('#<loc>(.+?)</loc>#', $this->get('/sitemap.xml')->getContent(), $khop);

    expect($khop[1])->not->toBeEmpty();

    foreach ($khop[1] as $url) {
        $duong = parse_url(html_entity_decode($url), PHP_URL_PATH) ?: '/';

        expect($this->get($duong)->getStatusCode())
            ->toBe(200, "sitemap khai {$duong} nhưng trang không trả 200");
    }
});

// Khai một trang noindex trong sitemap là tự mâu thuẫn: sitemap bảo "lập chỉ
// mục đi", thẻ meta bảo "đừng". Google chọn cái thứ hai và ghi nhận site gửi
// tín hiệu ngược nhau.
it('never lists a page that declares noindex', function () {
    preg_match_all('#<loc>(.+?)</loc>#', $this->get('/sitemap.xml')->getContent(), $khop);

    foreach ($khop[1] as $url) {
        $duong = parse_url(html_entity_decode($url), PHP_URL_PATH) ?: '/';

        expect($this->get($duong)->getContent())
            ->not->toMatch('#<meta[^>]+name=["\']robots["\'][^>]+noindex#i', "sitemap khai {$duong} nhưng trang tự khai noindex");
    }
});

// Trang cảm ơn noindex nên KHÔNG được nằm trong sitemap. Giữ riêng một test cho
// nó vì đây là trang duy nhất của luồng dễ bị thêm vào do "cho đủ bộ".
it('leaves the thank-you page out', function () {
    expect($this->get('/sitemap.xml')->getContent())
        ->not->toContain(route('demo_request.thanks'));
});

it('declares the sitemap in robots.txt', function () {
    expect(file_get_contents(public_path('robots.txt')))->toContain('Sitemap:');
});
