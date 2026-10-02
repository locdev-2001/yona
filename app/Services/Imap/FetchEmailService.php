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
use Webklex\PHPIMAP\Connection\Protocols\ProtocolInterface;
use Webklex\PHPIMAP\IMAP;

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
     * Mở INBOX chỉ đọc (EXAMINE: server không tự đánh dấu đã đọc), tìm thư trong cửa sổ,
     * lấy header một lô, rồi tải một lô thân của thư hộp thư chưa có. Số vòng gọi máy chủ
     * không phụ thuộc số thư: đi qua Message của thư viện thì mỗi thư chưa đọc tốn thêm
     * NOOP + STORE để giữ trạng thái chưa đọc, ~1 giây mỗi thư với Gmail.
     *
     * @return list<MailPresenter>
     */
    private function fetchEmails(): array
    {
        $connection = $this->timed('connect', fn () => $this->client()->getConnection());
        $this->timed('open_inbox', fn () => $connection->examineFolder('INBOX')->validatedData());
        $uids = $this->timed('search', fn () => $this->recentUids($connection));
        $this->messageCounts['in_window'] = count($uids);

        if ($uids === []) {
            return [];
        }

        /** @var array<int|string, string> $rawHeaders */
        $rawHeaders = $this->timed('fetch_headers', fn () => $connection->headers($uids, 'RFC822', IMAP::ST_UID)->validatedData());
        $newHeaders = $this->headersOfNewMails($rawHeaders);
        $this->messageCounts['new'] = count($newHeaders);

        if ($newHeaders === []) {
            return [];
        }

        /** @var array<int|string, string> $rawBodies */
        $rawBodies = $this->timed('fetch_bodies', fn () => $connection->content(array_keys($newHeaders), 'RFC822', IMAP::ST_UID)->validatedData());

        $emails = [];

        foreach ($newHeaders as $uid => $rawHeader) {
            $emails[] = MailPresenter::fromRaw($rawHeader."\r\n".($rawBodies[$uid] ?? ''), $this->channel->account);
        }

        Log::info('[IMAP] Fetched '.count($emails).' new emails for inbox '.$this->channel->inbox->id);

        return $emails;
    }

    /** @return list<int> UID thư từ mốc cửa sổ, mới nhất giữ lại khi vượt trần một lượt. */
    private function recentUids(ProtocolInterface $connection): array
    {
        $uids = (array) $connection->search(['SINCE "'.$this->since().'"'], IMAP::ST_UID)->validatedData();

        return array_slice(array_map('intval', $uids), -self::MAX_MESSAGES_PER_SYNC);
    }

    /**
     * @param  array<int|string, string>  $rawHeaders
     * @return array<int|string, string>
     */
    private function headersOfNewMails(array $rawHeaders): array
    {
        $tracker = new DeletedMessageTracker($this->channel->inbox);

        return array_filter($rawHeaders, function (string $rawHeader) use ($tracker) {
            $headers = MailPresenter::fromRaw($rawHeader, $this->channel->account);
            $messageId = $headers->messageId();

            return filled($messageId)
                && ! $headers->isNotificationEmailFromSelf()
                && ! $this->emailAlreadyPresent((string) $messageId, $tracker);
        });
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
