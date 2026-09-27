<?php

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Mail\ConversationReplyMail;
use App\Models\Attachment;
use App\Models\Channel\Email;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Messages\Forwarding\MessageForwarder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Tệp của bản ghi (disk thường) đi theo bản ghi: xoá, chuyển tiếp, dọn bản sao
// đều đụng tới tệp trên đĩa. Tệp MƯỢN (disk khai ở yona.attachment_borrowed_disks)
// thuộc về một kho dùng chung nên sống sót qua mọi thao tác đó.

const BORROWED_DISK = 'stickers';

const BORROWED_PATH = 'pack-1/sticker-1.png';

function ownedFileMessage(string $channelType = 'Channel::Api'): Message
{
    $conversation = Conversation::factory()->create();

    if ($channelType !== 'Channel::Api') {
        Inbox::query()->whereKey($conversation->inbox_id)->update(['channel_type' => $channelType]);
    }

    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ]);
}

function ownedFileAttachment(Message $message): Attachment
{
    return $message->attachments()->create(
        Attachment::storeUpload(UploadedFile::fake()->image('photo.png'), $message->account_id)
    );
}

function borrowedFileAttachment(Message $message): Attachment
{
    $contents = UploadedFile::fake()->image('sticker.png', 64, 64)->getContent();
    Storage::disk(BORROWED_DISK)->put(BORROWED_PATH, $contents);

    return $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => BORROWED_DISK,
        'path' => BORROWED_PATH,
        'filename' => 'sticker.png',
        'content_type' => 'image/png',
        'byte_size' => strlen($contents),
    ]);
}

function borrowedFileEmailMessage(): Message
{
    $conversation = Conversation::factory()->create();
    $channel = Email::factory()->create([
        'account_id' => $conversation->account_id,
        'email' => 'care@example.com',
        'smtp_enabled' => true,
        'smtp_address' => 'smtp.acme.test',
        'smtp_port' => 587,
    ]);
    Inbox::query()->whereKey($conversation->inbox_id)->update(['channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
    $contact = Contact::factory()->create(['account_id' => $conversation->account_id, 'email' => 'customer@example.com']);
    $conversation->update(['contact_id' => $contact->id]);

    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
    ]);
}

beforeEach(function () {
    Storage::fake('public');
    Storage::fake(BORROWED_DISK);
});

describe('owned files', function () {
    it('deletes the stored file together with the record', function () {
        $attachment = ownedFileAttachment(ownedFileMessage());
        Storage::disk('public')->assertExists($attachment->path);

        $attachment->delete();

        Storage::disk('public')->assertMissing($attachment->path);
    });

    it('copies the stored file to a new path that outlives the original', function () {
        $attachment = ownedFileAttachment(ownedFileMessage());

        $copy = $attachment->copyStoredFile();

        expect($copy['path'])->not->toBe($attachment->path)
            ->and($copy['disk'])->toBe('public');
        Storage::disk('public')->assertExists($copy['path']);

        $attachment->delete();

        Storage::disk('public')->assertMissing($attachment->path);
        Storage::disk('public')->assertExists($copy['path']);
    });

    it('discards unattached copies and keeps the attached ones', function () {
        $message = ownedFileMessage();
        $attachment = ownedFileAttachment($message);
        $attachedCopy = $attachment->copyStoredFile();
        $unattachedCopy = $attachment->copyStoredFile();
        $message->attachments()->create($attachedCopy);

        Attachment::discardUnattachedCopies([$attachedCopy, $unattachedCopy]);

        Storage::disk('public')->assertExists($attachedCopy['path']);
        Storage::disk('public')->assertMissing($unattachedCopy['path']);
    });

    it('redirects the file url to the url of its disk', function () {
        $attachment = ownedFileAttachment(ownedFileMessage());

        $this->get($attachment->fileUrl())
            ->assertStatus(301)
            ->assertRedirect(Storage::disk('public')->url($attachment->path));
    });

    it('drops the stored file when the message builder rejects the attachment', function () {
        $message = ownedFileMessage('Channel::WebWidget');
        $stored = Attachment::storeContents('MZ', 'setup.exe', 'application/x-msdownload', $message->account_id);

        expect(fn () => (new MessageBuilder(User::factory()->create(), $message->conversation, [
            'content' => 'hi',
            'attachments' => [Attachment::signUpload($stored)],
        ]))->perform())->toThrow(MessageValidationException::class, 'File type not supported');

        Storage::disk('public')->assertMissing($stored['path']);
    });
});

describe('borrowed files', function () {
    it('is a borrowed file only on a disk declared as borrowed', function () {
        expect((new Attachment(['disk' => 'public']))->ownsStoredFile())->toBeTrue()
            ->and((new Attachment(['disk' => BORROWED_DISK]))->ownsStoredFile())->toBeFalse();

        config(['yona.attachment_borrowed_disks' => []]);

        expect((new Attachment(['disk' => BORROWED_DISK]))->ownsStoredFile())->toBeTrue();
    });

    it('keeps the file when the record is deleted', function () {
        $attachment = borrowedFileAttachment(ownedFileMessage());

        $attachment->delete();

        Storage::disk(BORROWED_DISK)->assertExists(BORROWED_PATH);
    });

    it('shares the same path instead of copying the file', function () {
        $attachment = borrowedFileAttachment(ownedFileMessage());

        $copy = $attachment->copyStoredFile();

        expect($copy['path'])->toBe(BORROWED_PATH)
            ->and($copy['disk'])->toBe(BORROWED_DISK)
            ->and(Storage::disk(BORROWED_DISK)->allFiles())->toBe([BORROWED_PATH]);
    });

    it('has nothing to share once the borrowed file is gone from its library', function () {
        $attachment = borrowedFileAttachment(ownedFileMessage());
        Storage::disk(BORROWED_DISK)->delete(BORROWED_PATH);

        expect($attachment->copyStoredFile())->toBeNull();
    });

    it('never discards a borrowed file as an unattached copy', function () {
        $attachment = borrowedFileAttachment(ownedFileMessage());
        $copy = $attachment->copyStoredFile();
        $attachment->delete();

        Attachment::discardUnattachedCopies([$copy]);

        Storage::disk(BORROWED_DISK)->assertExists(BORROWED_PATH);
    });

    it('keeps the file when the message builder rejects the attachment', function () {
        $message = ownedFileMessage('Channel::WebWidget');
        $attachment = borrowedFileAttachment(ownedFileMessage());
        $rejected = [...$attachment->copyStoredFile(), 'account_id' => $message->account_id, 'content_type' => 'application/x-msdownload'];

        expect(fn () => (new MessageBuilder(User::factory()->create(), $message->conversation, [
            'content' => 'hi',
            'attachments' => [Attachment::signUpload($rejected)],
        ]))->perform())->toThrow(MessageValidationException::class, 'File type not supported');

        Storage::disk(BORROWED_DISK)->assertExists(BORROWED_PATH);
    });

    it('behaves as a real file for urls and redirects', function () {
        $attachment = borrowedFileAttachment(ownedFileMessage());

        expect($attachment->hasFile())->toBeTrue()
            ->and($attachment->downloadUrl())->not->toBe('');

        $this->get($attachment->fileUrl())
            ->assertStatus(301)
            ->assertRedirect(Storage::disk(BORROWED_DISK)->url(BORROWED_PATH));
    });

    it('attaches the borrowed file to the email reply', function () {
        $message = borrowedFileEmailMessage();
        borrowedFileAttachment($message);

        $mail = ConversationReplyMail::emailReply($message->fresh());

        $mail->assertHasAttachedData(Storage::disk(BORROWED_DISK)->get(BORROWED_PATH), 'sticker.png', ['mime' => 'image/png']);
    });

    it('survives revoking the source and deleting the forwarded copy', function () {
        Queue::fake();
        $source = ownedFileMessage();
        $source->update(['message_type' => Message::TYPE_INCOMING, 'content' => 'Mẫu này nhé']);
        borrowedFileAttachment($source);
        $target = Conversation::factory()->create(['account_id' => $source->account_id, 'inbox_id' => $source->inbox_id]);

        $forwarded = (new MessageForwarder)->forward($source->fresh(), $target, User::factory()->create());

        expect($forwarded->attachments()->sole()->only(['disk', 'path']))
            ->toBe(['disk' => BORROWED_DISK, 'path' => BORROWED_PATH]);

        $source->fresh()->markDeleted();
        $forwarded->fresh()->delete();

        Storage::disk(BORROWED_DISK)->assertExists(BORROWED_PATH);
        expect(Storage::disk(BORROWED_DISK)->allFiles())->toBe([BORROWED_PATH]);
    });
});
