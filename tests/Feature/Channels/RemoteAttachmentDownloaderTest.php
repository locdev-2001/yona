<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\MessageResource;
use App\Jobs\Attachments\RetryAttachmentDownloadJob;
use App\Models\Attachment;
use App\Models\Message;
use App\Services\Channels\RemoteAttachmentDownloader;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
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

// ─── Tải lại đính kèm fallback ─────────────────────────────────────────────────

// Lưu không qua hook để bài test tự gọi job, không bị lượt tải lại tự hẹn chạy trước.
function retryableFallbackAttachment(?int $reportedFileType = Attachment::FILE_TYPE_IMAGE): Attachment
{
    $message = Message::factory()->create();

    return Attachment::withoutEvents(fn () => $message->attachments()->create(RemoteAttachmentDownloader::fallbackAttributes(
        accountId: $message->account_id,
        filename: 'photo.jpg',
        externalUrl: 'https://cdn.test/photo.jpg',
        reportedFileType: $reportedFileType,
    )));
}

it('chỉ hẹn tải lại fallback có URL mở được, không hẹn khi URL cần bí mật của kênh', function () {
    Queue::fake([RetryAttachmentDownloadJob::class]);
    $message = Message::factory()->create();

    $withUrl = $message->attachments()->create(RemoteAttachmentDownloader::fallbackAttributes($message->account_id, 'a.jpg', 'https://cdn.test/a.jpg'));
    $message->attachments()->create(RemoteAttachmentDownloader::fallbackAttributes($message->account_id, 'b.jpg'));

    Queue::assertPushed(RetryAttachmentDownloadJob::class, 1);
    Queue::assertPushed(RetryAttachmentDownloadJob::class, fn (RetryAttachmentDownloadJob $job) => $job->attachment->is($withUrl)
        && $job->attempt === 1
        && $job->queue === 'low');
});

it('tải lại được thì đính kèm thành tệp thật và tin phát message.updated', function () {
    Http::fake(fn () => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']));
    $attachment = retryableFallbackAttachment();

    $payloads = [];
    Event::listen(DomainEvent::class, function (DomainEvent $event) use (&$payloads) {
        if ($event->type === EventType::MESSAGE_UPDATED) {
            $payloads[] = MessageResource::pushEventData($event->data['message']);
        }
    });

    (new RetryAttachmentDownloadJob($attachment))->handle();

    $attachment->refresh();

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->byte_size)->toBeGreaterThan(0)
        ->and(Storage::disk('public')->exists((string) $attachment->path))->toBeTrue()
        ->and($attachment->external_url)->toBeNull()
        ->and($attachment->fallback_title)->toBeNull()
        ->and($attachment->awaitsDownloadRetry())->toBeFalse()
        ->and($payloads)->toHaveCount(1)
        ->and($payloads[0]['attachments'][0]['file_type'])->toBe('image');
});

it('suy loại tệp tải lại như đường gốc: kênh báo âm thanh thì giữ âm thanh', function () {
    Http::fake(fn () => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']));
    $attachment = retryableFallbackAttachment(Attachment::FILE_TYPE_AUDIO);

    (new RetryAttachmentDownloadJob($attachment))->handle();

    expect($attachment->refresh()->file_type)->toBe(Attachment::FILE_TYPE_AUDIO);
});

it('vẫn thân rỗng thì giữ fallback, không tạo tệp và hẹn lượt kế', function () {
    Queue::fake([RetryAttachmentDownloadJob::class]);
    Http::fake(fn () => Http::response('', 200, ['Content-Type' => 'image/jpeg']));
    $attachment = retryableFallbackAttachment();

    (new RetryAttachmentDownloadJob($attachment))->handle();

    expect($attachment->refresh()->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBe('https://cdn.test/photo.jpg')
        ->and(Storage::disk('public')->allFiles())->toBe([]);
    Queue::assertPushed(RetryAttachmentDownloadJob::class, fn (RetryAttachmentDownloadJob $job) => $job->attempt === 2);
});

it('hết lượt thì giữ fallback, ghi cảnh báo một lần và thôi hẹn', function () {
    Queue::fake([RetryAttachmentDownloadJob::class]);
    Log::spy();
    Http::fake(fn () => Http::response('', 200, ['Content-Type' => 'image/jpeg']));
    $attachment = retryableFallbackAttachment();

    (new RetryAttachmentDownloadJob($attachment, count(RetryAttachmentDownloadJob::RETRY_DELAYS_SECONDS)))->handle();

    expect($attachment->refresh()->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBe('https://cdn.test/photo.jpg')
        ->and($attachment->awaitsDownloadRetry())->toBeFalse();
    Queue::assertNothingPushed();
    Log::shouldHaveReceived('warning')->withArgs(fn (string $line) => str_contains($line, 'Tải lại đính kèm'))->once();
});

it('đính kèm không còn là fallback thì job không làm gì', function () {
    Http::fake();
    $attachment = retryableFallbackAttachment();
    $attachment->update(['file_type' => Attachment::FILE_TYPE_FILE, 'external_url' => null]);

    (new RetryAttachmentDownloadJob($attachment))->handle();

    Http::assertNothingSent();
    expect($attachment->refresh()->file_type)->toBe(Attachment::FILE_TYPE_FILE);
});
