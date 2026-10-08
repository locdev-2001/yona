<?php

use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** @param array<string, mixed> $attributes */
function diskBackedMessageAttachment(Message $message, string $contents, array $attributes = []): Attachment
{
    $path = 'attachments/'.$message->account_id.'/'.Str::random(12).'.jpg';
    Storage::disk('public')->put($path, $contents);

    return $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'path' => $path,
        'filename' => 'anh-cdn.jpg',
        'content_type' => $contents === '' ? 'application/x-empty' : 'image/jpeg',
        'byte_size' => strlen($contents),
        ...$attributes,
    ]);
}

beforeEach(function () {
    Storage::fake('public');
    $this->message = Message::factory()->create();
});

it('chuyển ảnh 0 byte sang fallback giữ tên tệp và xoá tệp rỗng trên đĩa', function () {
    $empty = diskBackedMessageAttachment($this->message, '');
    $emptyPath = $empty->path;

    $this->artisan('attachments:repair-empty')
        ->expectsOutputToContain('Đã chuyển 1 đính kèm rỗng sang fallback')
        ->assertSuccessful();

    $empty->refresh();

    expect($empty->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($empty->fallback_title)->toBe('anh-cdn.jpg')
        ->and($empty->path)->toBeNull()
        ->and($empty->byte_size)->toBeNull()
        ->and($empty->content_type)->toBeNull()
        ->and(Storage::disk('public')->exists($emptyPath))->toBeFalse();
});

it('không đụng ảnh có nội dung, tệp mà DB ghi 0 byte nhưng đĩa có nội dung, hay đính kèm đã là fallback', function () {
    $healthy = diskBackedMessageAttachment($this->message, 'binary-image');
    $mismatched = diskBackedMessageAttachment($this->message, 'binary-image', ['byte_size' => 0]);
    $alreadyFallback = $this->message->attachments()->create([
        'account_id' => $this->message->account_id,
        'file_type' => Attachment::FILE_TYPE_FALLBACK,
        'byte_size' => 0,
        'fallback_title' => 'cu.jpg',
    ]);

    $this->artisan('attachments:repair-empty')
        ->expectsOutputToContain("Bỏ qua vì tệp trên đĩa có nội dung: #{$mismatched->id}")
        ->expectsOutputToContain('Đã chuyển 0 đính kèm rỗng sang fallback')
        ->assertSuccessful();

    expect($healthy->refresh()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($mismatched->refresh()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and(Storage::disk('public')->exists($mismatched->path))->toBeTrue()
        ->and($alreadyFallback->refresh()->fallback_title)->toBe('cu.jpg');
});

it('--dry-run chỉ in, không ghi; chạy thật hai lần không đổi gì thêm', function () {
    $empty = diskBackedMessageAttachment($this->message, '');

    $this->artisan('attachments:repair-empty --dry-run')
        ->expectsOutputToContain("#{$empty->id}")
        ->expectsOutputToContain('Thử chạy: 1 đính kèm rỗng sẽ chuyển sang fallback')
        ->assertSuccessful();

    expect($empty->refresh()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE);

    $this->artisan('attachments:repair-empty')->assertSuccessful();
    $this->artisan('attachments:repair-empty')
        ->expectsOutputToContain('Đã chuyển 0 đính kèm rỗng sang fallback')
        ->assertSuccessful();

    expect($empty->refresh()->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK);
});
