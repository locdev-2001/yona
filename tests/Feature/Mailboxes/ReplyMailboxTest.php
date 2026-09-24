<?php

use App\Mailboxes\ApplicationMailbox;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use Illuminate\Support\Facades\Storage;

// Port từ spec/mailboxes/reply_mailbox_spec.rb + spec/mailboxes/application_mailbox_spec.rb.

beforeEach(function () {
    Storage::fake('public');
    $this->account = Account::factory()->create();
});

function deliver(string $fixture): void
{
    ApplicationMailbox::route(MailPresenter::fromRaw(file_get_contents(base_path("tests/Fixtures/emails/{$fixture}"))));
}

it('adds the mail as a reply when the receiver carries the conversation uuid', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);
    $conversation->forceFill(['uuid' => '6bdc3f4d-0bec-4515-a284-5d916fdde489'])->save();

    deliver('reply.eml');

    $message = $conversation->messages()->latest('id')->first();

    expect($message->content)->toBe("Let's talk about these images:")
        ->and($message->content_type)->toBe(Message::CONTENT_TYPES['incoming_email'])
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->source_id)->toBe('0CB459E0-0336-41DA-BC88-E6E28C697DDB@example.com')
        ->and($message->attachments)->toHaveCount(2)
        ->and(array_keys($message->content_attributes['email']))->toBe([
            'bcc', 'cc', 'content_type', 'date', 'from', 'headers', 'html_content', 'in_reply_to',
            'message_id', 'multipart', 'number_of_attachments', 'references', 'subject', 'text_content',
            'to', 'auto_reply',
        ]);
});

it('does not create the message twice for the same source id', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);
    $conversation->forceFill(['uuid' => '6bdc3f4d-0bec-4515-a284-5d916fdde489'])->save();

    deliver('reply.eml');
    deliver('reply.eml');

    expect($conversation->messages()->count())->toBe(1);
});

it('finds the conversation through the in reply to header', function () {
    $channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'test@example.com']);
    $inbox = Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);
    $conversation->forceFill(['uuid' => '6bdc3f4d-0bec-4515-a284-5d916fdde489'])->save();

    deliver('reply_mail_without_uuid.eml');

    expect($conversation->messages()->count())->toBe(1);
});

it('opens a new conversation when the mail lands on the channel address', function () {
    $channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);

    deliver('support.eml');

    $conversation = Conversation::query()->where('account_id', $this->account->id)->first();

    expect($conversation)->not->toBeNull()
        ->and($conversation->additional_attributes['source'])->toBe('email')
        ->and($conversation->additional_attributes['mail_subject'])->toBe("Discussion: Let's debate these attachments")
        ->and($conversation->contact->email)->toBe('sony@example.com')
        ->and($conversation->messages()->count())->toBe(1);
});

it('matches the channel through the forward to address', function () {
    $channel = Email::factory()->create([
        'account_id' => $this->account->id,
        'email' => 'inbox@example.com',
        'forward_to_email' => 'care@example.com',
    ]);
    Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);

    deliver('support.eml');

    expect(Conversation::query()->where('inbox_id', $channel->inbox->id)->count())->toBe(1);
});

it('ignores a mail that belongs to no channel', function () {
    deliver('support.eml');

    expect(Conversation::query()->count())->toBe(0);
});

it('ignores notification mails sent by the installation itself', function () {
    config(['mail.sender_email' => 'sony@example.com']);
    $channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);

    deliver('support.eml');

    expect(Conversation::query()->count())->toBe(0);
});

it('reuses the existing contact of the inbox', function () {
    $channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    $inbox = Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);
    $contact = Contact::factory()->create(['account_id' => $this->account->id, 'email' => 'sony@example.com']);
    ContactInbox::factory()->create([
        'contact_id' => $contact->id,
        'inbox_id' => $inbox->id,
        'source_id' => 'sony@example.com',
    ]);

    deliver('support.eml');

    expect(Contact::query()->where('email', 'sony@example.com')->count())->toBe(1)
        ->and(Conversation::query()->first()->contact_id)->toBe($contact->id);
});

it('routes only mails that belong to a channel or carry a reply uuid', function () {
    $welcome = MailPresenter::fromRaw(file_get_contents(base_path('tests/Fixtures/emails/welcome.eml')));
    $reply = MailPresenter::fromRaw(file_get_contents(base_path('tests/Fixtures/emails/reply.eml')));
    $support = MailPresenter::fromRaw(file_get_contents(base_path('tests/Fixtures/emails/support.eml')));

    expect(ApplicationMailbox::routesToReply($welcome))->toBeFalse()
        ->and(ApplicationMailbox::routesToReply($reply))->toBeTrue()
        ->and(ApplicationMailbox::routesToReply($support))->toBeFalse();

    Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);

    expect(ApplicationMailbox::routesToReply($support))->toBeTrue();
});

it('accepts a to header that the parser can still salvage', function () {
    // Khác bản gốc: gem Mail trả String cho header hỏng rồi bỏ thư; zbateson
    // vẫn bóc ra được địa chỉ hợp lệ nên thư đi tiếp.
    $mail = MailPresenter::fromRaw(file_get_contents(base_path('tests/Fixtures/emails/mail_with_invalid_to.eml')));

    expect(ApplicationMailbox::validToAddress($mail))->toBeTrue()
        ->and($mail->to())->toBe(['vishnu@example.com']);
});

it('skips a bcc only mail for accounts on the skip list', function () {
    $channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);
    $raw = str_replace('To: "Replies" <care@example.com>', 'Bcc: care@example.com', file_get_contents(base_path('tests/Fixtures/emails/support.eml')));

    config(['mail.skip_incoming_bcc_processing' => (string) $this->account->id]);
    ApplicationMailbox::route(MailPresenter::fromRaw($raw));

    expect(Conversation::query()->count())->toBe(0);

    config(['mail.skip_incoming_bcc_processing' => '']);
    ApplicationMailbox::route(MailPresenter::fromRaw($raw));

    expect(Conversation::query()->count())->toBe(1);
});
