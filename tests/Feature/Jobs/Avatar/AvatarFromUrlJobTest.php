<?php

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Contact;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Port từ spec/jobs/avatar/avatar_from_url_job_spec.rb + hai khác biệt cố ý:
// nhận diện ảnh bằng nội dung (CDN Zalo trả `image/jpg`) và chỉ khoá hash khi
// gắn được ảnh.

const AVATAR_URL = 'https://cdn.example.com/avatar.jpg';

function pngBytes(): string
{
    return base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    );
}

function urlHash(string $url): string
{
    return hash('sha256', $url);
}

beforeEach(function () {
    Storage::fake('public');
    $this->contact = Contact::factory()->create(['additional_attributes' => []]);
});

it('gắn avatar khi CDN khai Content-Type không chuẩn image/jpg', function () {
    Http::fake([AVATAR_URL => Http::response(pngBytes(), 200, ['Content-Type' => 'image/jpg'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    $this->contact->refresh();

    expect($this->contact->avatar)->not->toBeNull()
        // Kiểu lưu lấy từ nội dung thật, không lấy theo lời khai của CDN.
        ->and($this->contact->avatar->content_type)->toBe('image/png')
        ->and($this->contact->additional_attributes['avatar_url_hash'])->toBe(urlHash(AVATAR_URL))
        ->and($this->contact->additional_attributes['last_avatar_sync_at'])->not->toBeEmpty();
});

it('gắn avatar khi Content-Type viết hoa và kèm charset', function () {
    Http::fake([AVATAR_URL => Http::response(pngBytes(), 200, ['Content-Type' => 'IMAGE/PNG; charset=binary'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    expect($this->contact->refresh()->avatar)->not->toBeNull();
});

it('không gắn và không khoá hash khi nội dung không phải ảnh', function () {
    Http::fake([AVATAR_URL => Http::response('<html>lỗi</html>', 200, ['Content-Type' => 'image/jpeg'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    $this->contact->refresh();

    expect($this->contact->avatar)->toBeNull()
        ->and($this->contact->additional_attributes)->not->toHaveKey('avatar_url_hash')
        // Cửa sổ 1 phút vẫn ghi để không tải lại dồn dập.
        ->and($this->contact->additional_attributes['last_avatar_sync_at'])->not->toBeEmpty();
});

it('không gắn khi máy chủ trả kiểu không phải ảnh', function () {
    Http::fake([AVATAR_URL => Http::response('{}', 200, ['Content-Type' => 'application/json'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    expect($this->contact->refresh()->avatar)->toBeNull();
});

it('cho phép thử lại URL đã hỏng vì hash chưa bị ghi', function () {
    Http::fake([AVATAR_URL => Http::sequence()
        ->push('không phải ảnh', 200, ['Content-Type' => 'image/jpeg'])
        ->push(pngBytes(), 200, ['Content-Type' => 'image/jpg'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();
    expect($this->contact->refresh()->avatar)->toBeNull();

    // Lượt sau CDN trả ảnh thật: rate limit đã qua thì phải tải lại được.
    $this->contact->forceFill([
        'additional_attributes' => ['last_avatar_sync_at' => now()->subMinutes(5)->toIso8601String()],
    ])->saveQuietly();

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    expect($this->contact->refresh()->avatar)->not->toBeNull();
});

it('bỏ qua khi hash trùng URL đã đồng bộ thành công', function () {
    $this->contact->forceFill(['additional_attributes' => ['avatar_url_hash' => urlHash(AVATAR_URL)]])->saveQuietly();
    Http::fake([AVATAR_URL => Http::response(pngBytes(), 200, ['Content-Type' => 'image/png'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    expect($this->contact->refresh()->avatar)->toBeNull();
    Http::assertNothingSent();
});

it('bỏ qua khi còn trong cửa sổ 1 phút', function () {
    $this->contact->forceFill([
        'additional_attributes' => ['last_avatar_sync_at' => now()->subSeconds(30)->toIso8601String()],
    ])->saveQuietly();
    Http::fake([AVATAR_URL => Http::response(pngBytes(), 200, ['Content-Type' => 'image/png'])]);

    (new AvatarFromUrlJob($this->contact, AVATAR_URL))->handle();

    expect($this->contact->refresh()->avatar)->toBeNull();
    Http::assertNothingSent();
});

it('không ghi thuộc tính đồng bộ khi URL rỗng', function () {
    (new AvatarFromUrlJob($this->contact, null))->handle();

    expect($this->contact->refresh()->additional_attributes)->toBe([]);
});
