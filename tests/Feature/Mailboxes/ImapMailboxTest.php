<?php

use App\Mailboxes\ImapMailbox;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use Illuminate\Support\Facades\Storage;

// Port từ spec/mailboxes/imap/imap_mailbox_spec.rb — kênh đã biết trước, chỉ còn
// việc nối thư vào hội thoại.

beforeEach(function () {
    Storage::fake('public');
    $this->account = Account::factory()->create();
    $this->channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    $this->inbox = Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $this->channel->id,
        'channel_type' => 'Channel::Email',
    ]);
});

function processImap(Email $channel, string $fixture): void
{
    (new ImapMailbox)->process(
        MailPresenter::fromRaw(file_get_contents(base_path("tests/Fixtures/emails/{$fixture}")), $channel->account),
        $channel
    );
}

it('creates contact, conversation and message from a fetched mail', function () {
    processImap($this->channel, 'support.eml');

    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    expect($conversation)->not->toBeNull()
        ->and($conversation->additional_attributes['source'])->toBe('email')
        ->and($conversation->additional_attributes['auto_reply'])->toBeFalse()
        ->and($conversation->contact->email)->toBe('sony@example.com')
        ->and($conversation->messages()->count())->toBe(1)
        ->and($conversation->messages()->first()->content_type)->toBe(Message::CONTENT_TYPES['incoming_email']);
});

it('threads a second mail into the same conversation through in reply to', function () {
    processImap($this->channel, 'support.eml');
    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    processImap($this->channel, 'in_reply_to.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(1)
        ->and($conversation->messages()->count())->toBe(2);
});

it('skips a mail whose sender is not a valid email', function () {
    processImap($this->channel, 'bounced_with_no_from.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(0);
});

it('skips every mail once the account is suspended', function () {
    $this->account->update(['status' => Account::STATUS_SUSPENDED]);

    processImap($this->channel->fresh(), 'support.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(0);
});

it('marks auto replies on the conversation', function () {
    processImap($this->channel, 'auto_reply.eml');

    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    expect($conversation?->additional_attributes['auto_reply'])->toBeTrue();
});
