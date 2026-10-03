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
use App\Services\Email\MailServerException;
use App\Services\Imap\DeletedMessageTracker;
use App\Services\Imap\FetchEmailService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Connection\Protocols\ProtocolInterface;
use Webklex\PHPIMAP\Connection\Protocols\Response;
use Webklex\PHPIMAP\Exceptions\ConnectionFailedException;
use Webklex\PHPIMAP\IMAP;

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
    Cache::lock('EMAIL_MESSAGE_MUTEX::'.$inbox->id, 150)->get();
    Log::spy();

    (new FetchImapEmailsJob($inbox->channel))->handle();

    Log::shouldNotHaveReceived('error');
});

function imapResponse(mixed $data): Response
{
    $response = Mockery::mock(Response::class);
    $response->shouldReceive('validatedData')->andReturn($data);

    return $response;
}

function rawImapHeader(string $messageId): string
{
    return "Message-ID: <{$messageId}>\r\nFrom: buyer@example.com\r\nSubject: Hi\r\n";
}

it('reads the inbox read-only and downloads, in one batch, only the bodies of mails the inbox does not have yet', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $knownId = uniqid('known-', true).'@example.com';
    $newId = uniqid('new-', true).'@example.com';
    $knownMessage = Message::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id, 'source_id' => $knownId]);
    $knownMessage->markDeleted('vi');

    $connection = Mockery::mock(ProtocolInterface::class);
    $connection->shouldReceive('examineFolder')->with('INBOX')->once()->andReturn(imapResponse([]));
    $connection->shouldNotReceive('selectFolder', 'store');
    $connection->shouldReceive('search')->once()->andReturn(imapResponse(['41', '42']));
    $connection->shouldReceive('headers')->with([41, 42], 'RFC822', IMAP::ST_UID)->once()
        ->andReturn(imapResponse([41 => rawImapHeader($knownId), 42 => rawImapHeader($newId)]));
    $connection->shouldReceive('content')->with([42], 'RFC822', IMAP::ST_UID)->once()
        ->andReturn(imapResponse([42 => 'Hello']));
    $client = Mockery::mock(Client::class);
    $client->shouldReceive('connect')->andReturnSelf();
    $client->connection = $connection;
    $connection->shouldReceive('getStream')->andReturn(null);
    $manager = Mockery::mock(ClientManager::class);
    $manager->shouldReceive('make')->andReturn($client);
    app()->instance(ClientManager::class, $manager);
    config(['mail.imap_slow_fetch_ms' => 0]);
    Log::spy();

    $mails = app(FetchEmailService::class, ['channel' => $inbox->channel])->perform();

    expect(array_map(fn (MailPresenter $mail) => $mail->messageId(), $mails))->toBe([$newId]);
    Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context = []) => str_starts_with($message, '[IMAP] Slow fetch')
        && array_keys($context['phases_ms']) === ['connect', 'open_inbox', 'search', 'fetch_headers', 'fetch_bodies', 'disconnect']
        && $context['messages_in_window'] === 2
        && $context['new_messages'] === 1);
});

it('IMAP dùng timeout riêng và không chờ logout khi kết nối đã thất bại', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    config(['mail.imap_read_timeout' => 7, 'mail.smtp_read_timeout' => 99]);
    $client = Mockery::mock(Client::class);
    $client->shouldReceive('connect')->once()->andThrow(new ConnectionFailedException('connection failed'));
    $client->shouldNotReceive('disconnect');
    $manager = Mockery::mock(ClientManager::class);
    $manager->shouldReceive('make')->once()->withArgs(fn (array $settings) => $settings['timeout'] === 7)->andReturn($client);

    expect(fn () => (new FetchEmailService($inbox->channel, clientManager: $manager))->perform())
        ->toThrow(MailServerException::class, 'connection failed');
});

it('job nhập thư một lần rồi lượt kế tiếp chỉ tìm UID mới', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $messageId = 'cursor-new@example.test';
    $connection = Mockery::mock(ProtocolInterface::class);
    $connection->shouldReceive('getStream')->andReturn(null);
    $connection->shouldReceive('examineFolder')->twice()->andReturn(imapResponse(['uidvalidity' => 100, 'uidnext' => 43]));
    $connection->shouldReceive('search')->withArgs(fn (array $criteria, int $flag) => str_starts_with($criteria[0], 'SINCE '))->once()->andReturn(imapResponse([42]));
    $connection->shouldReceive('search')->with(['UID 43:*'], IMAP::ST_UID)->once()->andReturn(imapResponse([42]));
    $connection->shouldReceive('headers')->with([42], 'RFC822', IMAP::ST_UID)->once()->andReturn(imapResponse([42 => rawImapHeader($messageId)]));
    $connection->shouldReceive('content')->with([42], 'RFC822', IMAP::ST_UID)->once()->andReturn(imapResponse([42 => 'Hello']));
    bindImapClient($connection);

    (new FetchImapEmailsJob($inbox->channel))->handle();
    expect($inbox->channel->refresh()->imap_sync_state['last_uid'])->toBe(42)
        ->and($inbox->messages()->where('source_id', $messageId)->count())->toBe(1);
    (new FetchImapEmailsJob($inbox->channel))->handle();
    expect($inbox->messages()->where('source_id', $messageId)->count())->toBe(1);
});

it('job giữ UID thư lỗi để nhập lại khi hết lỗi, không nhân đôi thư sau nó', function () {
    $inbox = emailInboxWith($this->account, ['imap_enabled' => true]);
    $failedId = 'retry-first@example.test';
    $goodId = 'retry-second@example.test';
    $connection = Mockery::mock(ProtocolInterface::class);
    $connection->shouldReceive('getStream')->andReturn(null);
    $connection->shouldReceive('examineFolder')->twice()->andReturn(imapResponse(['uidvalidity' => 100]));
    $connection->shouldReceive('search')->once()->andReturn(imapResponse([41, 42]));
    $connection->shouldReceive('search')->with(['UID 41,43:*'], IMAP::ST_UID)->once()->andReturn(imapResponse([41, 42]));
    $connection->shouldReceive('headers')->twice()->andReturn(imapResponse([41 => rawImapHeader($failedId), 42 => rawImapHeader($goodId)]));
    $connection->shouldReceive('content')->with([41, 42], 'RFC822', IMAP::ST_UID)->once()->andReturn(imapResponse([41 => 'First', 42 => 'Second']));
    $connection->shouldReceive('content')->with([41], 'RFC822', IMAP::ST_UID)->once()->andReturn(imapResponse([41 => 'First']));
    bindImapClient($connection);
    Message::creating(function (Message $message) use ($failedId) {
        if ($message->source_id === $failedId) {
            throw new RuntimeException('Thư giả lập xử lý lỗi');
        }
    });

    (new FetchImapEmailsJob($inbox->channel))->handle();
    expect($inbox->channel->refresh()->imap_sync_state['last_uid'])->toBe(42)
        ->and($inbox->channel->imap_sync_state['pending_uids'])->toBe([41])
        ->and($inbox->messages()->where('source_id', $failedId)->count())->toBe(0)
        ->and($inbox->messages()->where('source_id', $goodId)->count())->toBe(1);
    Event::forget('eloquent.creating: '.Message::class);
    (new FetchImapEmailsJob($inbox->channel))->handle();
    expect($inbox->channel->refresh()->imap_sync_state['last_uid'])->toBe(42)
        ->and($inbox->messages()->whereIn('source_id', [$failedId, $goodId])->count())->toBe(2);
});

function bindImapClient(ProtocolInterface $connection): void
{
    $client = Mockery::mock(Client::class);
    $client->connection = $connection;
    $client->shouldReceive('connect')->andReturnSelf();
    $client->shouldNotReceive('getConnection', 'disconnect');
    $manager = Mockery::mock(ClientManager::class);
    $manager->shouldReceive('make')->andReturn($client);
    app()->instance(ClientManager::class, $manager);
}
