<?php

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Jobs\ActionCableBroadcastJob;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/builders/messages/message_builder_spec.rb.
// Bỏ: kênh email cc/bcc + html/liquid content (F1). Case "channel is not api"
// giả lập bằng cách ghi thẳng channel_type khác lên inbox (driver kênh khác
// chưa port). signed_id của ActiveStorage thay bằng signed_id endpoint
// direct_uploads (quyết định #9).

function messageBuilderFixtures(): array
{
    $account = Account::factory()->create();
    $user = User::factory()->create();
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);

    return [$account, $user, $conversation];
}

describe('perform', function () {
    it('creates a message', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, ['content' => 'test']))->perform();

        expect($message->content)->toBe('test')
            ->and($message->message_type)->toBe(Message::TYPE_OUTGOING)
            ->and($message->sender)->toBeInstanceOf(User::class)
            ->and($message->sender->id)->toBe($user->id);
    });
});

describe('content_attributes', function () {
    it('parses content_attributes from JSON string', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'content_attributes' => '{"in_reply_to":42}',
        ]))->perform();

        expect($message->content_attributes)->toBe(['in_reply_to' => 42]);
    });

    it('uses content_attributes as provided when it is an array', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'content_attributes' => ['in_reply_to' => 42],
        ]))->perform();

        expect($message->content_attributes)->toBe(['in_reply_to' => 42]);
    });

    it('defaults to an empty hash when absent', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, ['content' => 'test']))->perform();

        expect($message->fresh()->content_attributes)->toBe([]);
    });

    it('defaults to an empty hash when nil', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'content_attributes' => null,
        ]))->perform();

        expect($message->fresh()->content_attributes)->toBe([]);
    });

    it('defaults to an empty hash when the JSON string is invalid', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'content_attributes' => 'invalid_json',
        ]))->perform();

        expect($message->fresh()->content_attributes)->toBe([]);
    });
});

describe('perform when message_type is incoming', function () {
    it('throws error when channel is not api', function () {
        [, $user, $conversation] = messageBuilderFixtures();
        $conversation->inbox->forceFill(['channel_type' => 'Channel::WebWidget'])->save();
        $conversation->refresh();

        expect(fn () => (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'message_type' => 'incoming',
        ]))->perform())->toThrow(MessageValidationException::class, 'Incoming messages are only allowed in Api inboxes');
    });

    it('creates message when channel is api with the contact as sender', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'message_type' => 'incoming',
        ]))->perform();

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->sender)->toBeInstanceOf(Contact::class)
            ->and($message->sender->id)->toBe($conversation->contact_id);
    });
});

describe('attachment messages', function () {
    beforeEach(function () {
        Storage::fake('public');
    });

    it('creates a message with attachments', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [UploadedFile::fake()->image('avatar.png')],
        ]))->perform();

        $attachment = $message->attachments->first();

        expect($attachment->fileTypeName())->toBe('image')
            ->and($attachment->account_id)->toBe($conversation->account_id)
            ->and($attachment->messageId())->toBe($message->id);
        Storage::disk('public')->assertExists($attachment->path);
    });

    it('creates a message with an attachment referenced by signed id', function () {
        [, $user, $conversation] = messageBuilderFixtures();
        $signedId = Attachment::signUpload(
            Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $conversation->account_id)
        );

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [$signedId],
        ]))->perform();

        expect($message->attachments->first()->fileTypeName())->toBe('image');
    });

    it('rejects a signed id belonging to another account', function () {
        [, $user, $conversation] = messageBuilderFixtures();
        $signedId = Attachment::signUpload(
            Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $conversation->account_id + 999)
        );

        expect(fn () => (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [$signedId],
        ]))->perform())->toThrow(MessageValidationException::class, 'Attachment reference is invalid');
    });

    it('sets is_voice_message in the attachment meta', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [UploadedFile::fake()->create('sample.ogg', 1, 'audio/ogg')],
            'is_voice_message' => true,
        ]))->perform();

        expect($message->attachments->first()->meta)->toMatchArray(['is_voice_message' => true]);
    });

    it('does not set is_voice_message when it is not provided', function () {
        [, $user, $conversation] = messageBuilderFixtures();

        $message = (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [UploadedFile::fake()->image('avatar.png')],
        ]))->perform();

        expect($message->attachments->first()->meta ?? [])->not->toHaveKey('is_voice_message');
    });

    it('rejects more attachments than allowed and creates no message', function () {
        [, $user, $conversation] = messageBuilderFixtures();
        $files = array_map(
            fn (int $index) => UploadedFile::fake()->image("avatar-{$index}.png"),
            range(1, Message::NUMBER_OF_PERMITTED_ATTACHMENTS + 1),
        );

        expect(fn () => (new MessageBuilder($user, $conversation, ['content' => 'test', 'attachments' => $files]))->perform())
            ->toThrow(MessageValidationException::class, 'Attachments exceeded maximum allowed');

        expect($conversation->messages()->count())->toBe(0)
            ->and(Attachment::query()->count())->toBe(0)
            ->and(Storage::disk('public')->allFiles())->toBe([]);
    });

    // autosave của Rails lưu attachments trong chính save! nên after_create_commit
    // (broadcast realtime) đã thấy tệp — payload message.created phải mang theo.
    it('carries the attachments in the realtime payload of the created message', function () {
        [, $user, $conversation] = messageBuilderFixtures();
        Queue::fake();

        (new MessageBuilder($user, $conversation, [
            'content' => 'test',
            'attachments' => [UploadedFile::fake()->image('avatar.png')],
        ]))->perform();

        $broadcast = collect(Queue::pushedJobs()[ActionCableBroadcastJob::class] ?? [])
            ->map(fn (array $pushed) => $pushed['job'])
            ->first(fn (ActionCableBroadcastJob $job) => $job->eventName === 'message.created');

        expect($broadcast)->not->toBeNull()
            ->and($broadcast->data['attachments'])->toHaveCount(1);
    });
});
