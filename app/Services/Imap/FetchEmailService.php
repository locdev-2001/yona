<?php

namespace App\Services\Imap;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use Illuminate\Support\Facades\Log;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Message;

/**
 * Port từ refs/chatwoot/app/services/imap/{base_fetch_email_service,fetch_email_service}.rb —
 * lấy thư mới của một kênh email qua IMAP và trả về danh sách đã parse.
 * Nhánh OAuth google/microsoft giữ nợ cho F6 (chỉ khác cách lấy mật khẩu).
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
        return $this->client ??= (new ClientManager)->make($this->connectionConfig());
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
            'authentication' => $this->authenticationType() === 'oauth' ? 'oauth' : null,
            'timeout' => config('mail.smtp_read_timeout'),
        ];
    }

    // Imap::Authentication — 'plain' là mặc định của bản gốc.
    private function authenticationType(): string
    {
        return strtolower((string) ($this->channel->imap_authentication ?: 'plain'));
    }

    private function imapPassword(): ?string
    {
        return $this->channel->imap_password;
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
        } catch (\Throwable $exception) {
            Log::info('[IMAP] Logout failed for '.$this->channel->email.' - '.$exception->getMessage());
        }
    }
}
