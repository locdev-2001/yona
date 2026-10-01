<?php

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Jobs\ConversationReplyEmailJob;
use App\Mail\ConversationReplyMail;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Email\ChannelMailer;
use App\Services\Email\SendOnEmailService;
use Illuminate\Support\Facades\Mail;

// Port từ spec/mailers/conversation_reply_mailer_spec.rb + spec/services/email/
// send_on_email_service_spec.rb + spec/jobs/conversation_reply_email_job_spec.rb.

function emailConversation(array $channelAttributes = []): Conversation
{
    $account = Account::factory()->create();
    // SMTP bật sẵn: bản gốc chỉ gửi thư khi cài đặt HOẶC kênh đã khai SMTP.
    $channel = Email::factory()->create([
        'account_id' => $account->id,
        'email' => 'care@example.com',
        'smtp_enabled' => true,
        'smtp_address' => 'smtp.acme.test',
        'smtp_port' => 587,
        ...$channelAttributes,
    ]);
    $inbox = Inbox::factory()->create([
        'account_id' => $account->id,
        'name' => 'Acme Support',
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);
    $contact = Contact::factory()->create(['account_id' => $account->id, 'email' => 'customer@example.com']);

    return Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
    ]);
}

it('sends an email reply for an outgoing message on an email inbox', function () {
    Mail::fake();
    // imap bật = kênh tự nhận thư trả lời, nên Reply-To là chính địa chỉ inbox.
    $conversation = emailConversation(['imap_enabled' => true]);
    $agent = User::factory()->create();

    $message = (new MessageBuilder($agent, $conversation, ['content' => 'Hello there']))->perform();

    (new SendOnEmailService($message))->perform();

    Mail::assertSent(ConversationReplyMail::class, function (ConversationReplyMail $mail) use ($conversation) {
        $envelope = $mail->envelope();

        return $mail->action === ConversationReplyMail::ACTION_EMAIL_REPLY
            && $envelope->to[0]->address === 'customer@example.com'
            && $envelope->replyTo[0]->address === 'care@example.com'
            && str_contains((string) $envelope->subject, "[#{$conversation->display_id}]");
    });
});

it('does not send private notes or activity messages', function () {
    Mail::fake();
    $conversation = emailConversation();
    $agent = User::factory()->create();

    $message = (new MessageBuilder($agent, $conversation, ['content' => 'internal', 'private' => true]))->perform();
    (new SendOnEmailService($message))->perform();

    Mail::assertNothingSent();
});

it('addresses the reply to the recipients listed on the message', function () {
    Mail::fake();
    $conversation = emailConversation();
    $agent = User::factory()->create();

    $message = (new MessageBuilder($agent, $conversation, [
        'content' => 'Hello',
        'to_emails' => 'a@example.com, b@example.com',
        'cc_emails' => 'cc@example.com',
        'bcc_emails' => 'bcc@example.com',
    ]))->perform();

    expect($message->content_attributes['to_emails'])->toBe(['a@example.com', 'b@example.com']);

    (new SendOnEmailService($message))->perform();

    Mail::assertSent(ConversationReplyMail::class, function (ConversationReplyMail $mail) {
        $envelope = $mail->envelope();

        return collect($envelope->to)->pluck('address')->all() === ['a@example.com', 'b@example.com']
            && $envelope->cc[0]->address === 'cc@example.com'
            && $envelope->bcc[0]->address === 'bcc@example.com';
    });
});

it('rejects an invalid recipient address', function () {
    $conversation = emailConversation();

    expect(fn () => (new MessageBuilder(User::factory()->create(), $conversation, [
        'content' => 'Hello',
        'to_emails' => 'not-an-email',
    ]))->perform())->toThrow(MessageValidationException::class, 'Invalid email address');
});

it('renders the message content as html on the outgoing message', function () {
    $conversation = emailConversation();

    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => "Hello **world**\nsecond"]))->perform();

    expect($message->content_attributes['email']['html_content']['reply'])->toContain('<strong>world</strong>')
        ->and($message->content_attributes['email']['text_content']['full'])->toBe("Hello **world**\nsecond");
});

it('uses the conversation mail subject on follow up replies', function () {
    Mail::fake();
    $conversation = emailConversation();
    $conversation->update(['additional_attributes' => ['mail_subject' => 'Broken widget']]);

    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'On it']))->perform();

    $mail = ConversationReplyMail::emailReply($message->fresh());

    expect($mail->envelope()->subject)->toBe('Broken widget');
});

it('threads the reply with message id, in reply to and references headers', function () {
    $conversation = emailConversation();
    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'first',
        'content_type' => Message::CONTENT_TYPES['incoming_email'],
        'source_id' => 'incoming-1@example.com',
        'content_attributes' => ['email' => [
            'message_id' => 'incoming-1@example.com',
            'references' => ['root@example.com'],
        ]],
    ]);

    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'reply']))->perform();
    $headers = ConversationReplyMail::emailReply($message->fresh())->headers();

    expect($headers->messageId)->toBe("conversation/{$conversation->uuid}/messages/{$message->id}@example.com")
        ->and($headers->text['In-Reply-To'])->toBe('<incoming-1@example.com>')
        ->and($headers->references)->toBe(['<root@example.com>', '<incoming-1@example.com>']);
});

it('threads the reply to the quoted email instead of the latest incoming one', function () {
    $conversation = emailConversation();
    $incomingEmail = fn (string $messageId, array $references) => $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => $messageId,
        'content_type' => Message::CONTENT_TYPES['incoming_email'],
        'source_id' => $messageId,
        'content_attributes' => ['email' => ['message_id' => $messageId, 'references' => $references]],
    ]);
    $quoted = $incomingEmail('old-1@example.com', ['root@example.com']);
    $incomingEmail('latest-2@example.com', ['root@example.com', 'old-1@example.com']);

    $message = (new MessageBuilder(User::factory()->create(), $conversation, [
        'content' => 'reply to the old one',
        'content_attributes' => ['in_reply_to' => $quoted->id],
    ]))->perform();
    $headers = ConversationReplyMail::emailReply($message->fresh())->headers();

    expect($headers->text['In-Reply-To'])->toBe('<old-1@example.com>')
        ->and($headers->references)->toBe(['<root@example.com>', '<old-1@example.com>']);
});

it('threads an unquoted reply to the newest incoming email', function () {
    $conversation = emailConversation();
    foreach (['old-1@example.com', 'latest-2@example.com'] as $messageId) {
        $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_INCOMING,
            'content' => $messageId,
            'content_type' => Message::CONTENT_TYPES['incoming_email'],
            'source_id' => $messageId,
            'content_attributes' => ['email' => ['message_id' => $messageId]],
        ]);
    }

    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'reply']))->perform();
    $headers = ConversationReplyMail::emailReply($message->fresh())->headers();

    expect($headers->text['In-Reply-To'])->toBe('<latest-2@example.com>');
});

it('falls back to a conversation level in reply to when no incoming email exists', function () {
    $conversation = emailConversation();
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'reply']))->perform();

    $headers = ConversationReplyMail::emailReply($message->fresh())->headers();

    expect($headers->text['In-Reply-To'])
        ->toBe("<account/{$conversation->account_id}/conversation/{$conversation->uuid}@example.com>");
});

it('builds the summary mail for non email channels', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = Conversation::factory()->create();
    $conversation->contact->update(['email' => 'customer@example.com']);
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();

    $mail = ConversationReplyMail::replyWithSummary($conversation->fresh(), $message->id);

    expect($mail)->not->toBeNull()
        ->and($mail->action)->toBe(ConversationReplyMail::ACTION_REPLY_WITH_SUMMARY)
        ->and($mail->messages->pluck('id')->all())->toBe([$message->id]);
});

it('recaps the ten newest chat messages before the queued reply', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = Conversation::factory()->create();
    $earlierIds = collect(range(12, 1))->map(fn (int $minutesAgo) => Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'created_at' => now()->subMinutes($minutesAgo),
    ])->id);
    $reply = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();

    $mail = ConversationReplyMail::replyWithSummary($conversation->fresh(), $reply->id);

    expect($mail->messages->pluck('id')->all())->toBe([...$earlierIds->slice(2)->values()->all(), $reply->id]);
});

it('sends the summary mail when the contact only saw an earlier reply', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = Conversation::factory()->create();
    Message::factory()->outgoing()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'created_at' => now()->subMinutes(10),
    ]);
    $conversation->update(['contact_last_seen_at' => now()->subMinutes(5)]);
    $reply = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello again']))->perform();

    expect(ConversationReplyMail::replyWithSummary($conversation->fresh(), $reply->id))->not->toBeNull();
});

it('signs the summary mail with the agent who replied last', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = emailConversation();
    $firstAgent = User::factory()->create(['name' => 'Agent Alpha']);
    $lastAgent = User::factory()->create(['name' => 'Agent Omega']);
    $firstReply = (new MessageBuilder($firstAgent, $conversation, ['content' => 'first']))->perform();
    (new MessageBuilder($lastAgent, $conversation, ['content' => 'second']))->perform();

    $from = ConversationReplyMail::replyWithoutSummary($conversation->fresh(), $firstReply->id)->envelope()->from;

    expect($from->name)->toContain('Agent Omega')->not->toContain('Agent Alpha');
});

it('skips the summary mail when the contact already saw the reply', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = Conversation::factory()->create();
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();
    $conversation->update(['contact_last_seen_at' => now()->addMinute()]);

    expect(ConversationReplyMail::replyWithSummary($conversation->fresh(), $message->id))->toBeNull();
});

it('sends the summary mail without recap when the last incoming message is an email', function () {
    Mail::fake();
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = emailConversation();
    $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'first',
        'content_type' => Message::CONTENT_TYPES['incoming_email'],
    ]);
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();

    (new ConversationReplyEmailJob($conversation->fresh(), $message->id))->handle();

    Mail::assertSent(ConversationReplyMail::class, fn (ConversationReplyMail $mail) => $mail->action === ConversationReplyMail::ACTION_REPLY_WITHOUT_SUMMARY);
});

it('picks the mail kind from the newest incoming message, not the first one', function () {
    Mail::fake();
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = emailConversation();
    $incoming = fn (int $contentType, DateTimeInterface $at) => Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'content_type' => $contentType,
        'created_at' => $at,
    ]);
    $incoming(Message::CONTENT_TYPES['text'], now()->subHour());
    $incoming(Message::CONTENT_TYPES['incoming_email'], now()->subMinute());
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();

    (new ConversationReplyEmailJob($conversation->fresh(), $message->id))->handle();

    Mail::assertSent(ConversationReplyMail::class, fn (ConversationReplyMail $mail) => $mail->action === ConversationReplyMail::ACTION_REPLY_WITHOUT_SUMMARY);
});

it('does not send anything for a suspended account', function () {
    $conversation = emailConversation();
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();
    $conversation->account->update(['status' => Account::STATUS_SUSPENDED]);

    Mail::fake();

    (new ConversationReplyEmailJob($conversation->fresh(), $message->id))->handle();

    Mail::assertNothingSent();
});

it('builds the conversation transcript for the requested address', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = emailConversation();
    (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello']))->perform();

    $mail = ConversationReplyMail::conversationTranscript($conversation->fresh(), 'boss@example.com');
    $envelope = $mail->envelope();

    expect($envelope->to[0]->address)->toBe('boss@example.com')
        ->and($envelope->subject)->toBe("[#{$conversation->display_id}] Conversation Transcript");
});

it('renders every reply template', function () {
    config(['mail.smtp_address' => 'smtp.acme.test']);
    $conversation = emailConversation();
    $message = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Hello **world**']))->perform();
    $conversation = $conversation->fresh();

    $emailReply = ConversationReplyMail::emailReply($message->fresh())->render();
    $summary = ConversationReplyMail::replyWithSummary($conversation, $message->id)->render();
    $withoutSummary = ConversationReplyMail::replyWithoutSummary($conversation, $message->id)->render();
    $transcript = ConversationReplyMail::conversationTranscript($conversation, 'boss@example.com')->render();

    expect($emailReply)->toContain('<strong>world</strong>')
        ->and($withoutSummary)->toContain('<strong>world</strong>')
        ->and($summary)->toContain('You have new messages on your conversation.')
        ->and($summary)->toContain('<!DOCTYPE html')
        ->and($transcript)->toContain('<!DOCTYPE html');
});

it('builds smtp settings from the channel when the inbox has its own server', function () {
    $conversation = emailConversation([
        'smtp_login' => 'user',
        'smtp_password' => 'pass',
        'smtp_enable_ssl_tls' => true,
    ]);

    $settings = ChannelMailer::smtpSettingsFor($conversation->inbox);

    expect($settings)->toMatchArray([
        'transport' => 'smtp',
        'host' => 'smtp.acme.test',
        'port' => 587,
        'username' => 'user',
        'password' => 'pass',
        'encryption' => 'tls',
    ]);
});

it('uses the provider smtp server for oauth channels', function () {
    $conversation = emailConversation(['imap_enabled' => true, 'smtp_enabled' => false, 'provider' => 'google', 'imap_login' => 'me@gmail.com']);
    $conversation->inbox->channel->update(['provider_config' => [
        'access_token' => 'token-123',
        'refresh_token' => 'refresh-123',
        'expires_at' => now()->addHour()->toIso8601String(),
    ]]);

    $settings = ChannelMailer::smtpSettingsFor($conversation->inbox->fresh());

    expect($settings)->toMatchArray([
        'host' => 'smtp.gmail.com', 'port' => 587, 'username' => 'me@gmail.com', 'password' => 'token-123', 'auth_mode' => 'xoauth2',
    ]);
});

it('has no smtp override for non email inboxes', function () {
    expect(ChannelMailer::smtpSettingsFor(Inbox::factory()->create()))->toBeNull();
});
