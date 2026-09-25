<?php

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Message;
use Illuminate\Support\Str;

/** @param array<string, mixed> $attributes */
function storedMessageAttachment(Message $message, array $attributes): Attachment
{
    return $message->attachments()->create([
        'account_id' => $message->account_id,
        'path' => 'attachments/'.$message->account_id.'/'.Str::random(8),
        'filename' => 'tep',
        'byte_size' => 1024,
        ...$attributes,
    ]);
}

beforeEach(function () {
    $this->message = Message::factory()->create();
});

it('đổi tệp media đang lưu nhầm là tệp sang đúng loại xem trước', function () {
    $video = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'video/mp4', 'filename' => 'clip.mp4']);
    $image = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'image/png', 'filename' => 'anh.png']);
    $audio = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'audio/aac', 'filename' => 'ghi-am.aac']);

    $this->artisan('attachments:reclassify-media')
        ->expectsOutputToContain('Đã đổi loại 3 tệp đính kèm')
        ->assertSuccessful();

    expect($video->refresh()->file_type)->toBe(Attachment::FILE_TYPE_VIDEO)
        ->and($image->refresh()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($audio->refresh()->file_type)->toBe(Attachment::FILE_TYPE_AUDIO);
});

it('không đụng tệp thật, loại media ngoài danh sách xem trước, tệp không nằm trên đĩa hay đính kèm ngoài tin nhắn', function () {
    $pdf = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'application/pdf']);
    $heic = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'image/heic']);
    $withoutPath = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'video/mp4', 'path' => null]);
    $contact = Contact::factory()->create(['account_id' => $this->message->account_id]);
    $avatar = new Attachment([
        'account_id' => $contact->account_id,
        'file_type' => Attachment::FILE_TYPE_FILE,
        'path' => 'avatars/a.png',
        'content_type' => 'image/png',
    ]);
    $avatar->attachable()->associate($contact)->save();

    $this->artisan('attachments:reclassify-media')
        ->expectsOutputToContain('Đã đổi loại 0 tệp đính kèm')
        ->assertSuccessful();

    expect(collect([$pdf, $heic, $withoutPath, $avatar])->map(fn (Attachment $attachment) => $attachment->refresh()->file_type)->unique()->all())
        ->toBe([Attachment::FILE_TYPE_FILE]);
});

it('--dry-run chỉ in số đếm và id, không ghi gì', function () {
    $video = storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'video/mp4']);

    $this->artisan('attachments:reclassify-media', ['--dry-run' => true])
        ->expectsOutputToContain("#{$video->id}")
        ->expectsOutputToContain('Thử chạy: 1 tệp đính kèm sẽ đổi loại (video: 1)')
        ->assertSuccessful();

    expect($video->refresh()->file_type)->toBe(Attachment::FILE_TYPE_FILE);
});

it('chạy lại lần hai không đổi gì thêm', function () {
    storedMessageAttachment($this->message, ['file_type' => Attachment::FILE_TYPE_FILE, 'content_type' => 'video/mp4']);

    $this->artisan('attachments:reclassify-media')->assertSuccessful();

    $this->artisan('attachments:reclassify-media')
        ->expectsOutputToContain('Đã đổi loại 0 tệp đính kèm')
        ->assertSuccessful();
});
