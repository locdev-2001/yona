<?php

use App\Models\Account;
use App\Models\Campaign;
use App\Models\Channel\WebWidget;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\MessageTemplates\HookExecutionService;

// Port từ spec/services/message_templates/hook_execution_service_spec.rb.
// Bỏ các ca tweet (kênh Twitter chưa port).

function closeInboxToday(Conversation $conversation, string $message = 'We are out of office'): void
{
    $conversation->inbox->update(['working_hours_enabled' => true, 'out_of_office_message' => $message]);
    $conversation->inbox->todayWorkingHour()->update([
        'closed_all_day' => true,
        'open_hour' => null,
        'open_minutes' => null,
        'close_hour' => null,
        'close_minutes' => null,
    ]);
}

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
    $campaign = Campaign::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
    ]);
    $conversation->update(['campaign_id' => $campaign->id]);

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

it('sends the out of office message outside working hours', function () {
    $conversation = templateConversation();
    closeInboxToday($conversation);

    incomingMessage($conversation);

    expect(templateMessages($conversation)->pluck('content')->all())->toContain('We are out of office');
});

it('sends the out of office message only once a day', function () {
    $conversation = templateConversation();
    closeInboxToday($conversation);

    incomingMessage($conversation);
    incomingMessage($conversation);

    expect(templateMessages($conversation)->where('content', 'We are out of office'))->toHaveCount(1);
});

it('skips the out of office message on campaign conversations', function () {
    $conversation = templateConversation();
    $conversation->update(['campaign_id' => Campaign::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
    ])->id]);
    closeInboxToday($conversation);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('skips the out of office message when the inbox has no message set', function () {
    // Khách đã có email → cụm email-collect không chèn, mọi tin mẫu thấy được
    // đều là của out-of-office.
    $conversation = templateConversation([], ['email' => 'visitor@example.com']);
    closeInboxToday($conversation, '');

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('skips the out of office message when an agent replied in the last five minutes', function () {
    $conversation = templateConversation([], ['email' => 'visitor@example.com']);
    closeInboxToday($conversation);

    incomingMessage($conversation, ['message_type' => Message::TYPE_OUTGOING, 'created_at' => now()->subMinutes(2)]);
    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('ignores a private note when looking for a recent agent reply', function () {
    $conversation = templateConversation([], ['email' => 'visitor@example.com']);
    closeInboxToday($conversation);

    incomingMessage($conversation, ['message_type' => Message::TYPE_OUTGOING, 'private' => true, 'created_at' => now()->subMinutes(2)]);
    incomingMessage($conversation);

    expect(templateMessages($conversation)->pluck('content')->all())->toContain('We are out of office');
});

it('skips the out of office message for an outgoing message', function () {
    $conversation = templateConversation([], ['email' => 'visitor@example.com']);
    // Tin đến TRƯỚC khi đóng cửa: cổng "đã có tin incoming" mở, cổng tin mẫu
    // trong ngày còn trống, chỉ còn hướng tin quyết định.
    incomingMessage($conversation);
    closeInboxToday($conversation);

    incomingMessage($conversation, ['message_type' => Message::TYPE_OUTGOING, 'created_at' => now()->subMinutes(10)]);

    expect(templateMessages($conversation))->toHaveCount(0);
});

it('does not send the out of office message during working hours', function () {
    $conversation = templateConversation(
        ['working_hours_enabled' => true, 'out_of_office_message' => 'We are out of office'],
        ['email' => 'visitor@example.com'],
    );
    $conversation->inbox->todayWorkingHour()->update(['closed_all_day' => false, 'open_all_day' => true]);

    incomingMessage($conversation);

    expect(templateMessages($conversation))->toHaveCount(0);
});
