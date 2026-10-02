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

    /** @var array<string, int> Thời gian (ms) từng pha IMAP của lượt quét, để biết lượt chậm nằm ở đâu. */
    private array $phaseMs = [];

    /** @var array{in_window: int, new: int} */
    private array $messageCounts = ['in_window' => 0, 'new' => 0];

    public function __construct(
        private readonly Email $channel,
        private readonly int $interval = 1,
        private readonly ClientManager $clientManager = new ClientManager,
    ) {}

    /** @return list<MailPresenter> */
    public function perform(): array
    {
        $startedAt = hrtime(true);

        try {
            return $this->fetchEmails();
        } finally {
            $this->timed('disconnect', fn () => $this->terminateConnection());
            $this->reportSlowFetch(self::elapsedMs($startedAt));
        }
    }

    /**
     * Hai pha: lấy header mọi thư trong cửa sổ, chỉ tải thân thư chưa có ở hộp thư.
     * Tải thân cả cửa sổ mỗi phút làm một lượt quét Gmail mất cả phút.
     *
     * @return list<MailPresenter>
     */
    private function fetchEmails(): array
    {
        $tracker = new DeletedMessageTracker($this->channel->inbox);
        $client = $this->timed('connect', fn () => $this->client());
        $inbox = $this->timed('open_inbox', fn () => $client->getFolderByPath('INBOX'));
        $inboxMessages = $this->timed('fetch_headers', fn () => $inbox->query()
            ->whereSince($this->since())
            ->setFetchBody(false)
            ->leaveUnread()
            ->limit(self::MAX_MESSAGES_PER_SYNC)
            ->get());
        $this->messageCounts['in_window'] = $inboxMessages->count();

        $emails = [];

        foreach ($inboxMessages as $inboxMessage) {
            $headers = MailPresenter::fromRaw($inboxMessage->getHeader()->raw, $this->channel->account);
            $messageId = $headers->messageId();

            if (blank($messageId) || $headers->isNotificationEmailFromSelf()) {
                continue;
            }

            if ($this->emailAlreadyPresent((string) $messageId, $tracker)) {
                continue;
            }

            $emails[] = $this->timed('fetch_bodies', fn () => $this->presenterWithBody($inboxMessage));
        }

        $this->messageCounts['new'] = count($emails);

        Log::info('[IMAP] Fetched '.count($emails).' new emails for inbox '.$this->channel->inbox->id);

        return $emails;
    }

    private function presenterWithBody(Message $inboxMessage): MailPresenter
    {
        $inboxMessage->parseBody();
        $raw = $inboxMessage->getHeader()->raw."\r\n".$inboxMessage->getRawBody();

        return MailPresenter::fromRaw($raw, $this->channel->account);
    }

    /**
     * @template T
     *
     * @param  callable(): T  $phase
     * @return T
     */
    private function timed(string $name, callable $phase): mixed
    {
        $startedAt = hrtime(true);

        try {
            return $phase();
        } finally {
            $this->phaseMs[$name] = ($this->phaseMs[$name] ?? 0) + self::elapsedMs($startedAt);
        }
    }

    private static function elapsedMs(int $startedAt): int
    {
        return intdiv(hrtime(true) - $startedAt, 1_000_000);
    }

    private function reportSlowFetch(int $totalMs): void
    {
        if ($totalMs < config('mail.imap_slow_fetch_ms')) {
            return;
        }

        Log::warning('[IMAP] Slow fetch for inbox '.$this->channel->inbox->id, [
            'total_ms' => $totalMs,
            'phases_ms' => $this->phaseMs,
            'messages_in_window' => $this->messageCounts['in_window'],
            'new_messages' => $this->messageCounts['new'],
        ]);
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
        $this->client = $this->clientManager->make($config);

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
