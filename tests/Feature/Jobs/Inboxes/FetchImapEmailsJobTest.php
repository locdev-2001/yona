<?php

use App\Jobs\Inboxes\FetchImapEmailInboxesJob;
use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Mailboxes\ImapMailbox;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Email\MailPresenter;
use App\Services\Imap\DeletedMessageTracker;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/jobs/inboxes/{fetch_imap_email_inboxes_job,fetch_imap_emails_job}_spec.rb
// + spec/services/imap/deleted_message_tracker_spec.rb.

beforeEach(function () {
    Storage::fake('public');
    $this->account = Account::factory()->create();
});

function emailInboxWith(Account $account, array $attributes = []): Inbox
{
    $channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'care@example.com', ...$attributes]);

    return Inbox::factory()->create([
        'account_id' => $account->id,
        'channel_id' => $channel->id,
        'channel_type' => 'Channel::Email',
    ]);
}

it('enqueues a fetch job for every imap enabled inbox', function () {
    Queue::fake();
    emailInboxWith($this->account, ['imap_enabled' => true]);
    emailInboxWith($this->account, ['imap_enabled' => false, 'email' => 'other@example.com']);

    (new FetchImapEmailInboxesJob)->handle();

    Queue::assertPushed(FetchImapEmailsJob::class, 1);
});

it('skips inboxes of suspended accounts', function () {
    Queue::fake();
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $this->account->update(['status' => Account::STATUS_SUSPENDED]);

    (new FetchImapEmailInboxesJob)->handle();

    Queue::assertNothingPushed();
});

it('skips inboxes that need reauthorization', function () {
    Queue::fake();
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $inbox->channel->promptReauthorization();

    (new FetchImapEmailInboxesJob)->handle();

    Queue::assertNothingPushed();

    $inbox->channel->reauthorized();
});

it('does nothing when imap is disabled on the channel', function () {
    $inbox = emailInboxWith($this->account);

    (new FetchImapEmailsJob($inbox->channel))->handle();

    expect(Conversation::query()->count())->toBe(0);
});

it('turns a fetched mail into one conversation of the inbox', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $mail = MailPresenter::fromRaw(file_get_contents(base_path('tests/Fixtures/emails/support.eml')), $this->account);

    (new ImapMailbox)->process($mail, $inbox->channel);

    expect(Conversation::query()->where('inbox_id', $inbox->id)->count())->toBe(1);
});

it('remembers deleted message ids for the inbox', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $tracker = new DeletedMessageTracker($inbox);
    $messageId = uniqid('gone-', true).'@example.com';

    expect($tracker->isDeleted($messageId))->toBeFalse();

    $tracker->record([$messageId, '', null]);

    expect($tracker->isDeleted($messageId))->toBeTrue()
        ->and($tracker->isDeleted(uniqid('other-', true).'@example.com'))->toBeFalse();
});
