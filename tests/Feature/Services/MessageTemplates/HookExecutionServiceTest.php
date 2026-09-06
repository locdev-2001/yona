<?php

use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\MessageTemplates\HookExecutionService;

// Port từ spec/services/message_templates/hook_execution_service_spec.rb.
// Bỏ các ca OutOfOffice (Business Hours chưa port) và tweet (kênh Twitter chưa port).

function templateConversation(array $inboxAttributes = [], array $contactAttributes = []): Conversation
{
    $account = Account::factory()->create();
    $channel = WebWidget::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create([
        'account_id' => $account->id,
        'channel_type' => 'Channel::WebWidget',
        'channel_id' => $channel->id,
        ...$inboxAttributes,
    ]);
    $contact = Contact::factory()->create(['account_id' => $account->id, ...$contactAttributes]);

    return Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
    ]);
}

function incomingMessage(Conversation $conversation, array $attributes = []): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        ...$attributes,
    ]);
}

function templateMessages(Conversation $conversation)
{
    return $conversation->messages()->where('message_type', Message::TYPE_TEMPLATE)->reorder('id')->get();
}

it('runs no hook when the conversation has no incoming message', function () {
    $conversation = templateConversation(['greeting_enabled' => true, 'greeting_message' => 'Hi', 'enable_email_collect' => true]);

    incomingMessage($conversation, ['message_type' => Message::TYPE_ACTIVITY, 'content' => 'Conversation marked resolved!!']);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('does not send a greeting when greeting_message is empty', function () {
    $conversation = templateConversation(['greeting_enabled' => true, 'enable_email_collect' => true]);

    incomingMessage($conversation);

    // Chỉ còn cụm email-collect (2 tin), không có tin chào.
    expect(templateMessages($conversation)->pluck('content')->all())
        ->toBe(['Give the team a way to reach you.', 'Get notified by email']);
});

it('sends the greeting and the email collect messages on the first visitor message', function () {
    $conversation = templateConversation([
        'greeting_enabled' => true,
        'greeting_message' => 'Hi, this is a greeting message',
        'enable_email_collect' => true,
    ]);

    incomingMessage($conversation);

    expect(templateMessages($conversation)->pluck('content')->all())->toBe([
        'Hi, this is a greeting message',
        'Give the team a way to reach you.',
        'Get notified by email',
    ]);
});

it('skips both templates on campaign conversations', function () {
    $conversation = templateConversation(['greeting_enabled' => true, 'greeting_message' => 'Hi', 'enable_email_collect' => true]);
    // campaign_id là cột giữ chỗ (C4 chưa port) nên không nằm trong $fillable.
    Conversation::query()->whereKey($conversation->id)->update(['campaign_id' => 1]);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('skips the email collect when the inbox has the flag off', function () {
    $conversation = templateConversation(['enable_email_collect' => false]);
    $conversation->inbox->channel->update(['pre_chat_form_enabled' => true]);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('skips the email collect when the contact already has an email', function () {
    $conversation = templateConversation(contactAttributes: ['email' => 'known@test.com']);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('skips the email collect outside the website channel', function () {
    $account = Account::factory()->create();
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => Inbox::factory()->create(['account_id' => $account->id])->id,
        'contact_id' => Contact::factory()->create(['account_id' => $account->id])->id,
    ]);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('sends the email collect only once per conversation', function () {
    $conversation = templateConversation();

    incomingMessage($conversation);
    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(2);
});

it('sends the greeting only on the first visitor message', function () {
    $conversation = templateConversation([
        'greeting_enabled' => true,
        'greeting_message' => 'Hi there',
        'enable_email_collect' => false,
    ]);

    incomingMessage($conversation);
    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(1);
});

it('runs no hook for an auto reply email', function () {
    $conversation = templateConversation(['greeting_enabled' => true, 'greeting_message' => 'Hi', 'enable_email_collect' => true]);
    incomingMessage($conversation);
    $conversation->messages()->where('message_type', Message::TYPE_TEMPLATE)->delete();

    $message = incomingMessage($conversation, [
        'content_type' => Message::CONTENT_TYPES['incoming_email'],
        'content_attributes' => ['email' => ['auto_reply' => true]],
    ]);

    (new HookExecutionService($message))->perform();

    expect(templateMessages($conversation))->toHaveCount(0);
});
