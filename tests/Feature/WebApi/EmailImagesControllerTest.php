<?php

use App\Models\User;
use App\Services\Email\RemoteEmailImage;
use Illuminate\Support\Facades\Http;

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function emailImageUrl(string $url): string
{
    return '/api/v1/email_image?'.http_build_query(['url' => $url]);
}

it('tải hộ ảnh trong thư cho người đã đăng nhập, không lưu, trình duyệt tự cache', function () {
    Http::fake(['images.example.com/*' => Http::response(base64_decode(TINY_PNG_BASE64), 200, ['Content-Type' => 'application/octet-stream'])]);

    $response = $this->actingAs(User::factory()->create())->get(emailImageUrl('https://images.example.com/logo.png'));

    $response->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff');
    expect($response->getContent())->toBe(base64_decode(TINY_PNG_BASE64))
        ->and($response->headers->get('Cache-Control'))->toContain('private')->toContain('max-age=604800');
});

it('khách chưa đăng nhập không dùng được proxy', function () {
    Http::fake();

    $this->getJson(emailImageUrl('https://images.example.com/logo.png'))->assertUnauthorized();

    Http::assertNothingSent();
});

it('không chuyển tiếp thứ không phải ảnh bitmap, kể cả SVG có script', function (string $body) {
    Http::fake(['images.example.com/*' => Http::response($body, 200, ['Content-Type' => 'image/svg+xml'])]);

    $this->actingAs(User::factory()->create())->get(emailImageUrl('https://images.example.com/x'))->assertNotFound();
})->with([
    'SVG' => ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    'HTML' => ['<html><body>hi</body></html>'],
]);

it('chặn URL trỏ vào mạng nội bộ mà không gọi ra ngoài', function () {
    config()->set('safe_http.allow_private_networks', false);
    Http::fake();

    $this->actingAs(User::factory()->create())->get(emailImageUrl('http://169.254.169.254/latest/meta-data'))->assertNotFound();

    Http::assertNothingSent();
});

it('ảnh vượt hạn mức thì không chuyển tiếp', function () {
    Http::fake(['images.example.com/*' => Http::response(str_repeat('a', RemoteEmailImage::MAX_BYTES + 1))]);

    $this->actingAs(User::factory()->create())->get(emailImageUrl('https://images.example.com/big.png'))->assertNotFound();
});
