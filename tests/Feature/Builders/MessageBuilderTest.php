<?php

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;

// Port từ spec/builders/messages/message_builder_spec.rb.
// Bỏ ở B3: attachments/direct upload/voice message (B9), kênh email cc/bcc +
// html/liquid content (F1). Case "channel is not api" giả lập bằng cách ghi
// thẳng channel_type khác lên inbox (driver kênh khác chưa port).

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
