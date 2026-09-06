<?php

use App\Jobs\WebhookJob;
use App\Support\SafeHttp;
use App\Support\UnsafeUrlException;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['safe_http.allow_private_networks' => false]);
});

it('cho qua URL công khai', function () {
    SafeHttp::assertPublicUrl('https://8.8.8.8/hook');
    SafeHttp::assertPublicUrl('http://93.184.216.34:8080/hook');
})->throwsNoExceptions();

it('chặn loopback, mạng nội bộ, link-local và metadata', function (string $url) {
    expect(fn () => SafeHttp::assertPublicUrl($url))->toThrow(UnsafeUrlException::class);
})->with([
    'http://127.0.0.1/hook',
    'http://localhost/hook',
    'http://10.1.2.3/hook',
    'http://192.168.0.10/hook',
    'http://172.16.0.5/hook',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/hook',
]);

it('chặn scheme ngoài http/https', function (string $url) {
    expect(fn () => SafeHttp::assertPublicUrl($url))->toThrow(UnsafeUrlException::class);
})->with(['file:///etc/passwd', 'gopher://127.0.0.1/', 'ftp://example.com/x', 'not-a-url']);

it('bỏ qua kiểm tra khi bật ALLOW_PRIVATE_WEBHOOK_URLS', function () {
    config(['safe_http.allow_private_networks' => true]);

    SafeHttp::assertPublicUrl('http://127.0.0.1:8000/hook');
})->throwsNoExceptions();

it('webhook không gửi request tới địa chỉ nội bộ', function () {
    Http::fake();

    (new WebhookJob('http://169.254.169.254/latest/meta-data/', ['event' => 'contact_created']))->handle();

    Http::assertNothingSent();
});

it('webhook vẫn gửi khi URL công khai', function () {
    Http::fake();

    (new WebhookJob('http://93.184.216.34/hook', ['event' => 'contact_created']))->handle();

    Http::assertSentCount(1);
});
