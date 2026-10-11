<?php

use Illuminate\Support\Arr;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;

// Trang đăng ký in link Điều khoản và Chính sách riêng tư ngay dưới nút đăng ký.
// Link chết ở đó là thứ đầu tiên một khách cẩn thận bấm vào trước khi giao dữ
// liệu khách hàng của họ cho Yona.

/** Cấu hình blade đẩy xuống cho React, đọc lại từ HTML như trình duyệt thấy. */
function landingConfigOf(TestResponse $response): array
{
    preg_match('/window\.landingConfig = (.*?);\s*<\/script>/s', (string) $response->getContent(), $khop);

    return json_decode($khop[1] ?? 'null', true, flags: JSON_THROW_ON_ERROR) ?? [];
}

it('hiện trang điều khoản và trang chính sách riêng tư', function (string $path, string $page, string $title, string $updatedOn) {
    $response = $this->get("$path?locale=vi")
        ->assertOk()
        ->assertSee("<title>{$title}</title>", escape: false);

    $config = landingConfigOf($response);

    expect($config['page'])->toBe($page)
        ->and($config['legalDocument']['updated'])->toBe("Cập nhật lần cuối: {$updatedOn}")
        ->and($config['legalDocument']['sections'])->not->toBeEmpty();
})->with([
    'điều khoản' => ['/dieu-khoan', 'terms', 'Điều khoản sử dụng · Yona', '24/09/2026'],
    'chính sách riêng tư' => ['/chinh-sach-rieng-tu', 'privacy', 'Chính sách riêng tư · Yona', '11/10/2026'],
]);

// Google thẩm định quyền Gmail đối chiếu trang này: phải nói rõ dữ liệu Google dùng
// vào đâu và cam kết Limited Use, ở cả bản tiếng Việt lẫn tiếng Anh.
it('chính sách riêng tư có mục dữ liệu Google kèm cam kết Limited Use', function (string $locale, string $limitedUse) {
    $google = landingConfigOf($this->get("/chinh-sach-rieng-tu?locale={$locale}")->assertOk())['legalDocument']['sections']['google_data'];

    expect($google['points'])->toHaveKeys(['accessed', 'use', 'storage', 'sharing', 'ai', 'people', 'disconnect', 'limited_use'])
        ->and($google['points']['limited_use'])->toContain($limitedUse)
        ->and($google['points']['limited_use'])->toContain('https://developers.google.com/terms/api-services-user-data-policy');
})->with([
    'tiếng Việt' => ['vi', 'Giới hạn sử dụng (Limited Use)'],
    'tiếng Anh' => ['en', 'Limited Use requirements'],
]);

it('chuyển hướng vĩnh viễn URL cũ đã in dưới nút đăng ký', function (string $oldPath, string $newPath) {
    $this->get($oldPath)->assertStatus(301)->assertRedirect($newPath);
})->with([
    ['/terms', '/dieu-khoan'],
    ['/privacy-policy', '/chinh-sach-rieng-tu'],
]);

it('trỏ link dưới nút đăng ký vào hai trang có thật', function () {
    $this->get('/app/auth/signup')->assertInertia(function (AssertableInertia $page) {
        $page->where('globalConfig.termsURL', url('/dieu-khoan'))
            ->where('globalConfig.privacyURL', url('/chinh-sach-rieng-tu'));
    });

    foreach ([config('yona.terms_url'), config('yona.privacy_url')] as $url) {
        $this->get(parse_url($url, PHP_URL_PATH))->assertOk();
    }
});

it('đưa cột Pháp lý vào footer của mọi trang công khai', function (string $path) {
    $config = landingConfigOf($this->get("$path?locale=vi"));

    expect($config['legalNav'])->toBe([
        'heading' => 'Pháp lý',
        'terms' => 'Điều khoản sử dụng',
        'privacy' => 'Chính sách riêng tư',
    ])
        ->and($config['urls']['terms'])->toBe(url('/dieu-khoan'))
        ->and($config['urls']['privacy'])->toBe(url('/chinh-sach-rieng-tu'));
})->with(['/', '/zalo-ca-nhan', '/dat-lich-demo', '/dieu-khoan']);

it('footer theo TERMS_URL khi bản cài đặt trỏ điều khoản ra ngoài', function () {
    config(['yona.terms_url' => 'https://phap-ly.example.vn/dieu-khoan']);

    expect(landingConfigOf($this->get('/'))['urls']['terms'])->toBe('https://phap-ly.example.vn/dieu-khoan');
});

// Mỗi văn bản chỉ sang văn bản còn lại: người đọc điều khoản gần như luôn cần
// cả chính sách riêng tư.
it('chỉ sang văn bản còn lại ở cuối trang', function (string $path, string $counterpart, string $label) {
    $related = landingConfigOf($this->get("$path?locale=vi"))['legalDocument']['related'];

    expect($related['href'])->toBe(url($counterpart))
        ->and($related['label'])->toBe($label);
})->with([
    ['/dieu-khoan', '/chinh-sach-rieng-tu', 'Chính sách riêng tư'],
    ['/chinh-sach-rieng-tu', '/dieu-khoan', 'Điều khoản sử dụng'],
]);

// Hai điều khách phải biết trước khi quét QR, và dễ bị "làm mềm" nhất khi ai đó
// sửa câu chữ: phiên Zalo nằm trên máy chủ CHƯA mã hoá, và đội Yona đăng nhập
// thay được.
it('nói thẳng cách lưu phiên Zalo và quyền đăng nhập thay của đội Yona', function () {
    $sections = landingConfigOf($this->get('/chinh-sach-rieng-tu?locale=vi'))['legalDocument']['sections'];
    $text = implode("\n", Arr::dot($sections));

    expect($text)->toContain('zca-js')
        ->toContain('quyền 0600')
        ->toContain('chưa được mã hoá khi lưu trên đĩa')
        ->toContain('đăng nhập dưới danh nghĩa một người dùng');
});

it('có bản tiếng Anh', function () {
    $response = $this->get('/dieu-khoan?locale=en')
        ->assertOk()
        ->assertSee('<title>Terms of use · Yona</title>', escape: false);

    expect(landingConfigOf($response)['legalDocument']['updated'])->toBe('Last updated: 24 September 2026');
});
