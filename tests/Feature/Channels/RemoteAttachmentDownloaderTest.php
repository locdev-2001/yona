<?php

use App\Services\Channels\RemoteAttachmentDownloader;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Channels\ChannelFixture;

// Đường tải tệp dùng chung của MỌI kênh — port lib/safe_fetch/fetcher.rb.
// Ba lớp bảo vệ khoá ở đây: URL nội bộ, hạn mức kích thước, và bộ nhớ khi
// tệp lớn.

// Phiên test bật ALLOW_PRIVATE_WEBHOOK_URLS (phpunit.xml) vì fake host không
// phân giải được; các bài khoá SSRF tự tắt cờ đó để đo đúng luật production.
beforeEach(function () {
    Storage::fake('public');
});

it('chặn URL trỏ vào mạng nội bộ', function () {
    config()->set('safe_http.allow_private_networks', false);
    Http::fake();

    $attributes = RemoteAttachmentDownloader::download('http://169.254.169.254/latest/meta-data/', 1);

    expect($attributes)->toBeNull();
    Http::assertNothingSent();
});

it('chặn cả loopback và dải riêng', function (string $url) {
    config()->set('safe_http.allow_private_networks', false);
    Http::fake();

    expect(RemoteAttachmentDownloader::download($url, 1))->toBeNull();
    Http::assertNothingSent();
})->with([
    'http://127.0.0.1/anh.jpg',
    'http://10.0.0.5/anh.jpg',
    'http://192.168.1.10/anh.jpg',
    'file:///etc/passwd',
]);

it('cho phép mạng nội bộ khi ALLOW_PRIVATE_WEBHOOK_URLS bật', function () {
    config()->set('safe_http.allow_private_networks', true);
    Http::fake(['*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

    expect(RemoteAttachmentDownloader::download('http://127.0.0.1/anh.jpg', 1))->not->toBeNull();
});

it('từ chối tệp khai kích thước vượt hạn mức mà không tải nội dung', function () {
    config()->set('limits.maximum_file_upload_size', 1);
    Http::fake(['*' => Http::response('x', 200, [
        'Content-Type' => 'image/jpeg',
        'Content-Length' => (string) (2 * 1024 * 1024),
    ])]);

    expect(RemoteAttachmentDownloader::download('https://cdn.test/anh.jpg', 1))->toBeNull()
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

it('từ chối tệp vượt hạn mức dù máy chủ không khai Content-Length', function () {
    config()->set('limits.maximum_file_upload_size', 1);
    Http::fake(['*' => Http::response(ChannelFixture::jpegBytes(2 * 1024 * 1024), 200, ['Content-Type' => 'image/jpeg'])]);

    expect(RemoteAttachmentDownloader::download('https://cdn.test/anh.jpg', 1))->toBeNull()
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

it('lỗi mạng trả null thay vì ném ra ngoài', function () {
    Http::fake(fn () => throw new ConnectionException('timeout'));

    expect(RemoteAttachmentDownloader::download('https://cdn.test/anh.jpg', 1))->toBeNull();
});

it('thân rỗng dù trả 200 là tải hỏng, không lưu tệp 0 byte', function () {
    Http::fake(['*' => Http::response('', 200, ['Content-Type' => 'image/jpeg'])]);

    expect(RemoteAttachmentDownloader::download('https://cdn.test/anh.jpg', 1))->toBeNull()
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

it('lấy kiểu MIME từ nội dung chứ không tin lời khai của máy chủ', function () {
    Http::fake(['*' => Http::response('<html><body>xin chào</body></html>', 200, ['Content-Type' => 'image/png'])]);

    $attributes = RemoteAttachmentDownloader::download('https://cdn.test/anh.png', 1);

    expect($attributes['content_type'])->toBe('text/html');
});

it('không nạp cả tệp lớn vào RAM', function () {
    $megabytes = 20;
    $sourcePath = tempnam(sys_get_temp_dir(), 'yona-big-media-');
    file_put_contents($sourcePath, ChannelFixture::jpegBytes($megabytes * 1024 * 1024));

    // Nguồn phải là stream đọc từ ĐĨA: nếu fixture đã nằm sẵn trong RAM thì
    // `$response->body()` chỉ trả lại chính chuỗi đó (copy-on-write) và bài đo
    // không phân biệt được bản stream với bản nạp cả tệp.
    Http::fake(fn () => Http::response(
        Utils::streamFor(fopen($sourcePath, 'rb')),
        200,
        ['Content-Type' => 'image/jpeg'],
    ));

    // Bản cũ gọi `$response->body()` rồi `Attachment::storeContents()` ⇒ đỉnh bộ
    // nhớ nhảy ít nhất bằng kích thước tệp. Bản stream ghi theo khối 256KB.
    // Phải reset đỉnh: mốc cũ của tiến trình (boot framework, DB) cao hơn 20MB
    // nên nếu chỉ trừ hai lần đo thì bản nạp cả tệp cũng lọt.
    $baseline = memory_get_usage(true);
    memory_reset_peak_usage();
    $attributes = RemoteAttachmentDownloader::download('https://cdn.test/anh.jpg', 1);
    $growth = memory_get_peak_usage(true) - $baseline;

    @unlink($sourcePath);

    expect($attributes)->not->toBeNull()
        ->and($attributes['byte_size'])->toBeGreaterThan($megabytes * 1024 * 1024)
        ->and($growth)->toBeLessThan(12 * 1024 * 1024);
});
