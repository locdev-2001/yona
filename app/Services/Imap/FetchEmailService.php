<?php

namespace App\Services\Imap;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Illuminate\Support\Facades\Log;
use Throwable;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Message;

/**
 * Lấy thư mới của một kênh email qua IMAP và trả về danh sách đã parse.
 * Hộp thư nối OAuth (Google/Microsoft) đăng nhập XOAUTH2 bằng access token còn hạn.
 */
class FetchEmailService
{
    public const MAX_MESSAGES_PER_SYNC = 500;

    private ?Client $client = null;

    public function __construct(
        private readonly Email $channel,
        private readonly int $interval = 1,
    ) {}

    /** @return list<MailPresenter> */
    public function perform(): array
    {
        try {
            return $this->fetchEmails();
        } finally {
            $this->terminateConnection();
        }
    }

    /** @return list<MailPresenter> */
    private function fetchEmails(): array
    {
        $tracker = new DeletedMessageTracker($this->channel->inbox);
        $inboxMessages = $this->client()->getFolderByPath('INBOX')->query()
            ->whereSince($this->since())
            ->setFetchBody(true)
            ->leaveUnread()
            ->limit(self::MAX_MESSAGES_PER_SYNC)
            ->get();

        $emails = [];

        foreach ($inboxMessages as $inboxMessage) {
            $mail = $this->presenterFor($inboxMessage);
            $messageId = $mail->messageId();

            if (blank($messageId) || $mail->isNotificationEmailFromSelf()) {
                continue;
            }

            if ($this->emailAlreadyPresent((string) $messageId, $tracker)) {
                continue;
            }

            $emails[] = $mail;
        }

        Log::info('[IMAP] Fetched '.count($emails).' new emails for inbox '.$this->channel->inbox->id);

        return $emails;
    }

    private function presenterFor(Message $inboxMessage): MailPresenter
    {
        $raw = $inboxMessage->getHeader()->raw."\r\n".$inboxMessage->getRawBody();

        return MailPresenter::fromRaw($raw, $this->channel->account);
    }

    private function emailAlreadyPresent(string $messageId, DeletedMessageTracker $tracker): bool
    {
        return $this->channel->inbox->messages()->where('source_id', $messageId)->exists()
            || $tracker->isDeleted($messageId);
    }

    private function client(): Client
    {
        if ($this->client !== null) {
            return $this->client;
        }

        $config = $this->connectionConfig();
        $this->client = (new ClientManager)->make($config);

        try {
            $this->client->connect();
        } catch (Throwable $exception) {
            throw MailServerException::fromImap($exception, (string) $this->channel->imap_address, (int) $this->channel->imap_port);
        }

        return $this->client;
    }

    /** @return array<string, mixed> */
    private function connectionConfig(): array
    {
        return [
            'host' => $this->channel->imap_address,
            'port' => $this->channel->imap_port,
            'encryption' => $this->channel->imap_enable_ssl ? 'ssl' : false,
            'validate_cert' => true,
            'username' => $this->channel->imap_login,
            'password' => $this->imapPassword(),
            'protocol' => 'imap',
            'authentication' => $this->usesOAuth() ? 'oauth' : null,
            'timeout' => config('mail.smtp_read_timeout'),
        ];
    }

    // Hộp thư nối bằng OAuth (Google/Microsoft) đăng nhập XOAUTH2 bằng access token.
    private function usesOAuth(): bool
    {
        return $this->channel->usesOAuth() || strtolower((string) $this->channel->imap_authentication) === 'oauth';
    }

    private function imapPassword(): ?string
    {
        return $this->channel->usesOAuth()
            ? app(EmailOAuthTokenManager::class)->accessToken($this->channel)
            : $this->channel->imap_password;
    }

    // SINCE <hôm nay - interval ngày>, định dạng d-M-Y của IMAP.
    private function since(): string
    {
        return now()->subDays(max($this->interval, 1))->format('d-M-Y');
    }

    private function terminateConnection(): void
    {
        try {
            $this->client?->disconnect();
        } catch (Throwable $exception) {
            Log::info('[IMAP] Logout failed for '.$this->channel->email.' - '.$exception->getMessage());
        }
    }
}
