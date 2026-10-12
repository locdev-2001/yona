<?php

namespace App\Services\Imap;

use App\Models\Channel\Email;
use App\Services\Email\Fetch\MailboxFetcher;
use App\Services\Email\Fetch\NewMailFilter;
use App\Services\Email\MailPresenter;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;
use Webklex\PHPIMAP\Client;
use Webklex\PHPIMAP\ClientManager;
use Webklex\PHPIMAP\Connection\Protocols\ProtocolInterface;
use Webklex\PHPIMAP\IMAP;

/**
 * Lấy thư mới của một kênh email qua IMAP và trả về danh sách đã parse.
 * Hộp thư nối OAuth (Google/Microsoft) đăng nhập XOAUTH2 bằng access token còn hạn.
 */
class FetchEmailService implements MailboxFetcher
{
    public const MAX_MESSAGES_PER_SYNC = 500;

    private ?Client $client = null;

    private bool $fetchSucceeded = false;

    private ?ImapSyncCursor $cursor = null;

    private array $mailUids = [];

    private int $startedAt = 0;

    /** @var array<string, int> Thời gian (ms) từng pha IMAP của lượt quét, để biết lượt chậm nằm ở đâu. */
    private array $phaseMs = [];

    /** @var array{in_window: int, new: int} */
    private array $messageCounts = ['in_window' => 0, 'new' => 0];

    public function __construct(
        private readonly Email $channel,
        private readonly int $interval = 1,
        private readonly ClientManager $clientManager = new ClientManager,
    ) {}

    // Mặc định cho mọi hộp thư bật IMAP; driver riêng của nhà cung cấp đứng trước trong MailboxFetchers.
    public static function supports(Email $channel): bool
    {
        return true;
    }

    /** @return list<MailPresenter> */
    public function perform(): array
    {
        $startedAt = hrtime(true);
        $this->startedAt = $startedAt;

        try {
            $emails = $this->fetchEmails();
            $this->fetchSucceeded = true;

            return $emails;
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
        $connection = $this->timed('connect', fn () => $this->client()->connection ?? throw new RuntimeException('IMAP connection unavailable'));
        $folder = $this->timed('open_inbox', fn () => $connection->examineFolder('INBOX')->validatedData());
        $this->cursor = new ImapSyncCursor($this->channel, (array) $folder);
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
            if (! array_key_exists($uid, $rawBodies)) {
                throw new RuntimeException('IMAP body missing for UID '.$uid);
            }

            $mail = MailPresenter::fromRaw($rawHeader."\r\n".$rawBodies[$uid], $this->channel->account);
            $this->mailUids[spl_object_id($mail)] = (int) $uid;
            $emails[] = $mail;
        }

        Log::info('[IMAP] Fetched '.count($emails).' new emails for inbox '.$this->channel->inbox->id);

        return $emails;
    }

    /** @return list<int> UID chưa xử lý, ưu tiên thư cần thử lại và nhận thư mới từ cũ tới mới. */
    private function recentUids(ProtocolInterface $connection): array
    {
        $uids = (array) $connection->search($this->cursor->criteria($this->since()), IMAP::ST_UID)->validatedData();

        return $this->cursor->select($uids);
    }

    public function acknowledge(MailPresenter $mail): void
    {
        $uid = $this->mailUids[spl_object_id($mail)] ?? null;

        if ($uid !== null) {
            $this->cursor?->completed($uid);
        }
    }

    public function commitSyncProgress(): void
    {
        $this->cursor?->checkpoint();
    }

    /**
     * @param  array<int|string, string>  $rawHeaders
     * @return array<int|string, string>
     */
    private function headersOfNewMails(array $rawHeaders): array
    {
        $presenters = array_map(fn (string $header) => MailPresenter::fromRaw($header, $this->channel->account), $rawHeaders);
        ['fresh' => $fresh, 'skipped' => $skipped] = (new NewMailFilter($this->channel))->split($presenters);

        foreach ($skipped as $uid) {
            $this->cursor?->completed((int) $uid);
        }

        return array_intersect_key($rawHeaders, $fresh);
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
            if ($name !== 'disconnect') {
                $remaining = 90 - intdiv(self::elapsedMs($this->startedAt), 1000);

                if ($remaining <= 0) {
                    throw new RuntimeException('IMAP fetch deadline exceeded');
                }

                $stream = $this->client?->connection?->getStream();

                if (is_resource($stream)) {
                    stream_set_timeout($stream, min($remaining, max(1, (int) config('mail.imap_read_timeout'))));
                }
            }

            return $phase();
        } catch (Throwable $exception) {
            Log::warning('[IMAP] Phase failed for inbox '.$this->channel->inbox->id, [
                'phase' => $name,
                'exception_class' => $exception::class,
            ]);

            throw MailServerException::fromImap($exception, (string) $this->channel->imap_address, (int) $this->channel->imap_port);
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
            'timeout' => max(1, (int) config('mail.imap_read_timeout')),
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
        $connection = $this->client?->connection;
        $stream = $connection?->getStream();

        if (! is_resource($stream)) {
            return;
        }

        try {
            if ($this->fetchSucceeded) {
                stream_set_timeout($stream, max(1, (int) config('mail.imap_logout_timeout')));
                $connection->logout();
            }
        } catch (Throwable $exception) {
            Log::info('[IMAP] Logout failed for inbox '.$this->channel->inbox->id, ['exception_class' => $exception::class]);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }

            $connection->reset();
            $this->client->connection = null;
        }
    }
}
