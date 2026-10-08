<?php

use App\Exceptions\MessageValidationException;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Port từ spec/models/attachment_spec.rb.
// Bỏ: mọi case Instagram (story_mention/ig_reel/direct message — driver kênh
// Meta chưa port), unrepresentable image (ActiveStorage representation).

function attachmentMessage(string $channelType = 'Channel::Api'): Message
{
    $conversation = Conversation::factory()->create();

    if ($channelType !== 'Channel::Api') {
        Inbox::query()->whereKey($conversation->inbox_id)->update(['channel_type' => $channelType]);
        $conversation->unsetRelation('inbox');
    }

    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ]);
}

function attachmentWithFile(Message $message, UploadedFile $file, array $overrides = []): Attachment
{
    return $message->attachments()->create([
        ...Attachment::storeUpload($file, $message->account_id),
        ...$overrides,
    ]);
}

beforeEach(function () {
    Storage::fake('public');
});

describe('external url validations', function () {
    it('is valid when within the limit', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'external_url' => str_repeat('a', config('limits.url_length')),
        ]);

        expect($attachment->exists)->toBeTrue();
    });

    it('is invalid when it crosses the limit', function () {
        $message = attachmentMessage();

        expect(fn () => $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'external_url' => str_repeat('a', config('limits.url_length') + 5),
        ]))->toThrow(MessageValidationException::class, 'External url is too long (maximum is 2048 characters)');
    });
});

describe('file urls', function () {
    it('returns a download url', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('avatar.png'));

        // URL kết thúc bằng tên tệp gốc (ActiveStorage) chứ không phải tên băm trên đĩa.
        expect($attachment->downloadUrl())->not->toBe('')
            ->and($attachment->fileUrl())->toEndWith('/'.$attachment->filename)
            ->and($attachment->fileUrl())->toContain((string) $attachment->id);
    });

    it('returns an empty thumb url for non image attachments', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->create('test.pdf', 1, 'application/pdf'));

        expect($attachment->fileTypeName())->toBe('file')
            ->and($attachment->thumbUrl())->toBe('');
    });

    it('generates a thumb url for image attachments', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('test.jpg'));

        expect($attachment->thumbUrl())->not->toBe('')
            ->and($attachment->thumbUrl())->toBe($attachment->fileUrl());
    });

    // data_url mà hộp thư nhận phải dẫn tới đúng tệp đang nằm trên đĩa của nó:
    // 301 (vĩnh viễn, trình duyệt cache được) sang URL do chính disk đó dựng.
    it('redirects the image data url to the stored file on its disk', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('IMG_1234.jpg'));
        $dataUrl = $attachment->pushEventData()['data_url'];

        expect($dataUrl)->toEndWith('/IMG_1234.jpg');

        $this->get($dataUrl)
            ->assertStatus(301)
            ->assertRedirect(Storage::disk($attachment->disk)->url($attachment->path));

        Storage::disk($attachment->disk)->assertExists($attachment->path);
    });

    // ActiveStorage nhét signed_id vào URL; ở đây là token HMAC ở đoạn giữa. Biết
    // id và tên tệp gốc mà không có chữ ký thì không mở được tệp.
    it('serves the file only with a valid signature', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('signed.png'));

        $this->get($attachment->fileUrl())->assertRedirect();

        $this->get("/attachments/{$attachment->id}/not-a-signature/{$attachment->filename}")->assertForbidden();
        $this->get("/attachments/{$attachment->id}/{$attachment->filename}")->assertNotFound();
    });

    it('serves the redirect without touching the session', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('group.jpg'));

        $response = $this->get($attachment->fileUrl())->assertStatus(301);

        expect($response->headers->getCookies())->toBe([]);
    });

    it('rejects a signature minted for another attachment', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('mine.png'));
        $other = attachmentWithFile($message, UploadedFile::fake()->image('yours.png'));

        $token = Attachment::fileToken($other->id, null);

        $this->get("/attachments/{$attachment->id}/{$token}/{$attachment->filename}")->assertForbidden();
    });

    // Redirect là 301 (trình duyệt lưu lâu): tệp được thay (tải lại, khôi phục) thì URL
    // phải đổi theo, nếu không trình duyệt cứ theo chuyển hướng cũ tới tệp đã xoá.
    it('changes the app url when the stored file is replaced, and the old url still redirects to the new file', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('restored.png'));
        $urlBefore = $attachment->fileUrl();

        $attachment->update(['path' => 'attachments/'.$attachment->account_id.'/replaced.png']);
        $urlAfter = $attachment->fileUrl();

        expect($urlAfter)->not->toBe($urlBefore);
        $this->get($urlAfter)->assertRedirect(Storage::disk($attachment->disk)->url($attachment->path));
        $this->get($urlBefore)->assertRedirect(Storage::disk($attachment->disk)->url($attachment->path));
    });

    it('rejects an expired download signature', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('expired.png'));

        $token = Attachment::fileToken($attachment->id, time() - 1);

        $this->get("/attachments/{$attachment->id}/{$token}/{$attachment->filename}")->assertForbidden();
    });

    // URL gửi ra ngoài phải hết hạn (blob.url của gốc = 5 phút); URL trong app thì không.
    it('signs external download urls with an expiry and app urls without one', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('ttl.png'));

        $claims = fn (string $url) => json_decode(
            (string) base64_decode(strtr(explode('.', explode('/', $url)[5])[0], '-_', '+/'), true),
            true,
        );

        expect($claims($attachment->fileUrl())['exp'])->toBeNull()
            ->and($claims($attachment->downloadUrl())['exp'])->toBeGreaterThan(time())
            ->and($claims($attachment->downloadUrl())['exp'])->toBeLessThanOrEqual(time() + 600)
            // Hai lần dựng trong cùng cửa sổ ra cùng một chuỗi.
            ->and($attachment->downloadUrl())->toBe($attachment->downloadUrl());
    });
});

describe('with attached file', function () {
    it('returns true for an attachment carrying a file', function () {
        $message = attachmentMessage();

        expect(attachmentWithFile($message, UploadedFile::fake()->image('avatar.png'))->withAttachedFile())->toBeTrue();
    });

    it('returns false for an attachment without a file', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_FALLBACK,
        ]);

        expect($attachment->withAttachedFile())->toBeFalse();
    });
});

describe('meta data handling', function () {
    it('stores and retrieves meta data for contact attachments', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_CONTACT,
            'fallback_title' => '+1234567890',
            'meta' => ['first_name' => 'John', 'last_name' => 'Doe'],
        ]);

        expect($attachment->meta['first_name'])->toBe('John')
            ->and($attachment->pushEventData()['meta'])->toBe(['first_name' => 'John', 'last_name' => 'Doe']);
    });

    it('returns an empty meta for contact attachments without meta', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_CONTACT,
            'fallback_title' => '+1234567890',
        ]);

        expect($attachment->fresh()->pushEventData()['meta'])->toBe([]);
    });

    it('preserves meta data alongside a file', function () {
        $message = attachmentMessage();

        $attachment = attachmentWithFile(
            $message,
            UploadedFile::fake()->image('avatar.png'),
            ['meta' => ['description' => 'Test image']],
        );

        expect($attachment->meta['description'])->toBe('Test image');
    });
});

describe('push_event_data', function () {
    it('returns the location metadata', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'coordinates_lat' => 10.5,
            'coordinates_long' => 20.5,
            'fallback_title' => 'Somewhere',
            'external_url' => 'https://maps.example.com/1',
        ]);

        expect($attachment->pushEventData())->toMatchArray([
            'file_type' => 'location',
            'coordinates_lat' => 10.5,
            'coordinates_long' => 20.5,
            'fallback_title' => 'Somewhere',
            'data_url' => 'https://maps.example.com/1',
        ]);
    });

    it('returns the external url as data url for embed attachments', function () {
        $message = attachmentMessage();

        $attachment = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_EMBED,
            'external_url' => 'https://example.com/embed',
        ]);

        expect($attachment->pushEventData()['data_url'])->toBe('https://example.com/embed');
    });

    it('returns the extension and content type for file attachments', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->create('test.pdf', 1, 'application/pdf'));

        expect($attachment->pushEventData())->toMatchArray([
            'message_id' => $message->id,
            'account_id' => $message->account_id,
            'file_type' => 'file',
            'extension' => 'pdf',
            'content_type' => 'application/pdf',
        ]);
    });

    it('carries the image dimensions', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('avatar.png', 120, 80));

        expect($attachment->pushEventData())->toMatchArray(['width' => 120, 'height' => 80]);
    });
});

describe('set extension', function () {
    it('sets the extension from the filename on save', function () {
        $message = attachmentMessage();

        expect(attachmentWithFile($message, UploadedFile::fake()->create('test.pdf', 1, 'application/pdf'))->extension)->toBe('pdf');
    });

    it('does not overwrite an extension already set', function () {
        $message = attachmentMessage();

        $attachment = attachmentWithFile(
            $message,
            UploadedFile::fake()->create('test.pdf', 1, 'application/pdf'),
            ['extension' => 'doc'],
        );

        expect($attachment->extension)->toBe('doc');
    });

    it('handles filenames without an extension', function () {
        $message = attachmentMessage();

        expect(attachmentWithFile($message, UploadedFile::fake()->create('README', 1, 'text/plain'))->extension)->toBeNull();
    });
});

describe('file validation', function () {
    it('does not validate files outside the website widget', function () {
        config(['limits.maximum_file_upload_size' => 1]);
        $message = attachmentMessage();

        $attachment = attachmentWithFile(
            $message,
            UploadedFile::fake()->create('big.exe', 1, 'application/x-msdownload'),
            ['byte_size' => 5 * 1024 * 1024],
        );

        expect($attachment->exists)->toBeTrue();
    });

    it('rejects a file bigger than the configured limit', function () {
        config(['limits.maximum_file_upload_size' => 5]);
        $message = attachmentMessage('Channel::WebWidget');

        expect(fn () => attachmentWithFile(
            $message,
            UploadedFile::fake()->image('avatar.png'),
            ['byte_size' => 6 * 1024 * 1024],
        ))->toThrow(MessageValidationException::class, 'File size is too big');
    });

    it('falls back to the default limit when the configured one is invalid', function () {
        config(['limits.maximum_file_upload_size' => -10]);
        $message = attachmentMessage('Channel::WebWidget');

        expect(fn () => attachmentWithFile(
            $message,
            UploadedFile::fake()->image('avatar.png'),
            ['byte_size' => 41 * 1024 * 1024],
        ))->toThrow(MessageValidationException::class, 'File size is too big');
    });

    it('rejects an unsupported content type', function () {
        $message = attachmentMessage('Channel::WebWidget');

        expect(fn () => attachmentWithFile(
            $message,
            UploadedFile::fake()->create('script.sh', 1, 'application/x-sh'),
        ))->toThrow(MessageValidationException::class, 'File type not supported');
    });

    it('accepts a generic content type with an acceptable extension', function () {
        $message = attachmentMessage('Channel::WebWidget');

        $attachment = attachmentWithFile(
            $message,
            UploadedFile::fake()->create('cert.pfx', 1, 'application/octet-stream'),
        );

        expect($attachment->exists)->toBeTrue();
    });

    it('accepts media files and the documented types', function () {
        $message = attachmentMessage('Channel::WebWidget');

        expect(attachmentWithFile($message, UploadedFile::fake()->image('avatar.png'))->exists)->toBeTrue()
            ->and(attachmentWithFile($message, UploadedFile::fake()->create('doc.pdf', 1, 'application/pdf'))->exists)->toBeTrue();
    });
});

describe('file deletion', function () {
    it('removes the stored file when the attachment is deleted', function () {
        $message = attachmentMessage();
        $attachment = attachmentWithFile($message, UploadedFile::fake()->image('avatar.png'));
        $path = $attachment->path;

        Storage::disk('public')->assertExists($path);
        $attachment->delete();
        Storage::disk('public')->assertMissing($path);
    });
});

describe('copyStoredFile', function () {
    it('sao tệp sang đường dẫn mới, giữ thuộc tính; xoá bản gốc thì bản sao còn', function () {
        $message = attachmentMessage();
        $original = attachmentWithFile($message, UploadedFile::fake()->create('bao-gia.pdf', 12, 'application/pdf'));

        $copy = $original->copyStoredFile();

        expect($copy['path'])->not->toBe($original->path)
            ->and($copy['path'])->toEndWith('.pdf')
            ->and($copy['filename'])->toBe('bao-gia.pdf')
            ->and($copy['content_type'])->toBe('application/pdf')
            ->and($copy['byte_size'])->toBe($original->byte_size)
            ->and($copy['file_type'])->toBe(Attachment::FILE_TYPE_FILE)
            ->and($copy['account_id'])->toBe($original->account_id);

        $original->delete();

        Storage::disk('public')->assertMissing($original->path);
        Storage::disk('public')->assertExists($copy['path']);
    });

    it('trả null khi không còn tệp để sao', function () {
        $message = attachmentMessage();
        $external = $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'external_url' => 'https://cdn.example.test/a.png',
        ]);
        $missingOnDisk = new Attachment([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'path' => 'attachments/khong-ton-tai.png',
            'filename' => 'khong-ton-tai.png',
        ]);

        expect($external->copyStoredFile())->toBeNull()
            ->and($missingOnDisk->copyStoredFile())->toBeNull();
    });

    it('discardUnattachedCopies giữ bản sao đã gắn vào đính kèm, xoá bản chưa ai dùng', function () {
        $message = attachmentMessage();
        $original = attachmentWithFile($message, UploadedFile::fake()->create('bao-gia.pdf', 12, 'application/pdf'));
        $attachedCopy = $original->copyStoredFile();
        $orphanCopy = $original->copyStoredFile();
        $message->attachments()->create($attachedCopy);

        Attachment::discardUnattachedCopies([$attachedCopy, $orphanCopy]);

        Storage::disk('public')->assertExists($attachedCopy['path']);
        Storage::disk('public')->assertMissing($orphanCopy['path']);
        Storage::disk('public')->assertExists($original->path);
    });
});
