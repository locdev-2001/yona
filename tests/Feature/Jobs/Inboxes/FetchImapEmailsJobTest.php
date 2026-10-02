<?php

use App\Jobs\Inboxes\FetchImapEmailInboxesJob;
use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Mailboxes\ImapMailbox;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use App\Services\Imap\DeletedMessageTracker;
use App\Services\Imap\FetchEmailService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Folder;
use Webklex\PHPIMAP\Header;
use Webklex\PHPIMAP\Message as ImapMessage;
use Webklex\PHPIMAP\Query\WhereQuery;
use Webklex\PHPIMAP\Support\MessageCollection;

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

it('skips quietly while the previous fetch of the same inbox still holds the lock', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    Cache::lock('EMAIL_MESSAGE_MUTEX::'.$inbox->id, 300)->get();
    Log::spy();

    (new FetchImapEmailsJob($inbox->channel))->handle();

    Log::shouldNotHaveReceived('error');
});

function imapMessageWithId(string $messageId, bool $expectsBodyFetch): ImapMessage
{
    $header = Mockery::mock(Header::class);
    $header->raw = "Message-ID: <{$messageId}>\r\nFrom: buyer@example.com\r\nSubject: Hi\r\n";

    $message = Mockery::mock(ImapMessage::class);
    $message->shouldReceive('getHeader')->andReturn($header);
    $message->shouldReceive('getRawBody')->andReturn('Hello');
    $message->shouldReceive('parseBody')->times($expectsBodyFetch ? 1 : 0)->andReturnSelf();

    return $message;
}

it('downloads the body only of mails the inbox does not have yet', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $knownId = uniqid('known-', true).'@example.com';
    $newId = uniqid('new-', true).'@example.com';
    Message::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id, 'source_id' => $knownId]);

    $query = Mockery::mock(WhereQuery::class);
    $query->shouldReceive('whereSince', 'leaveUnread', 'limit')->andReturnSelf();
    $query->shouldReceive('setFetchBody')->with(false)->once()->andReturnSelf();
    $query->shouldReceive('get')->andReturn(new MessageCollection([
        imapMessageWithId($knownId, expectsBodyFetch: false),
        imapMessageWithId($newId, expectsBodyFetch: true),
    ]));
    $folder = Mockery::mock(Folder::class);
    $folder->shouldReceive('query')->andReturn($query);
    $client = Mockery::mock(Client::class);
    $client->shouldReceive('connect', 'disconnect')->andReturnSelf();
    $client->shouldReceive('getFolderByPath')->with('INBOX')->andReturn($folder);
    $manager = Mockery::mock(ClientManager::class);
    $manager->shouldReceive('make')->andReturn($client);
    app()->instance(ClientManager::class, $manager);

    $mails = app(FetchEmailService::class, ['channel' => $inbox->channel])->perform();

    expect(array_map(fn (MailPresenter $mail) => $mail->messageId(), $mails))->toBe([$newId]);
});
