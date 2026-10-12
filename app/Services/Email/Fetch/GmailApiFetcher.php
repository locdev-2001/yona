<?php

namespace App\Services\Email\Fetch;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Kéo thư INBOX của hộp Gmail qua Gmail API thay cho IMAP: lần đầu (hoặc khi lịch sử đã quá
 * hạn) lấy thư trong cửa sổ `interval` ngày, sau đó chỉ hỏi `history.list` từ historyId đã lưu.
 * Mốc đồng bộ nằm ở `imap_sync_state` của kênh, cùng chỗ với con trỏ IMAP.
 */
final class GmailApiFetcher implements MailboxFetcher
{
    public const MAX_MESSAGES_PER_SYNC = 500;

    private const STATE_DRIVER = 'gmail_api';

    private const API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

    private const HOST = 'gmail.googleapis.com';

    private const PORT = 443;

    private const TIMEOUT_SECONDS = 20;

    // Gmail giới hạn 250 đơn vị/giây/người dùng, mỗi messages.get tốn 5: tải dồn dập là bị 403/429.
    private const PARALLEL_DOWNLOADS = 5;

    private const RATE_LIMIT_STATUSES = [403, 429];

    private const RETRIES_PER_SYNC = 100;

    // Tải thư dừng sau mốc này, phần còn lại sang lượt sau: còn thời gian nhập thư trước khi job hết 120 giây.
    private const DOWNLOAD_BUDGET_SECONDS = 60;

    private ?string $nextHistoryId = null;

    /** @var list<string> */
    private array $selectedIds = [];

    /** @var list<string> */
    private array $deferredIds = [];

    /** @var array<string, true> */
    private array $completedIds = [];

    /** @var array<int, string> spl_object_id của thư => id thư Gmail */
    private array $mailIds = [];

    private ?CarbonImmutable $startedAt = null;

    /** @var array{selected: int, downloaded: int, new: int} */
    private array $counts = ['selected' => 0, 'downloaded' => 0, 'new' => 0];

    public function __construct(
        private readonly Email $channel,
        private readonly int $interval,
        private readonly EmailOAuthTokenManager $tokens,
    ) {}

    public static function supports(Email $channel): bool
    {
        return $channel->isGoogle();
    }

    /** @return list<MailPresenter> */
    public function perform(): array
    {
        $this->startedAt = CarbonImmutable::now();

        try {
            return $this->fetchNewMails();
        } finally {
            $this->reportSlowFetch();
        }
    }

    /** @return list<MailPresenter> */
    private function fetchNewMails(): array
    {
        $candidateIds = array_values(array_unique([...$this->requestedRetries(), ...$this->newMessageIds()]));
        $this->selectedIds = array_slice($candidateIds, 0, self::MAX_MESSAGES_PER_SYNC);
        $this->deferredIds = array_slice($candidateIds, self::MAX_MESSAGES_PER_SYNC);

        $mails = array_map(
            fn (string $raw) => MailPresenter::fromRaw($raw, $this->channel->account),
            $this->rawMessages($this->selectedIds),
        );
        $this->counts = ['selected' => count($this->selectedIds), 'downloaded' => count($mails), 'new' => 0];

        ['fresh' => $fresh, 'skipped' => $skipped] = (new NewMailFilter($this->channel))->split($mails);

        foreach ($skipped as $id) {
            $this->completedIds[(string) $id] = true;
        }

        foreach ($fresh as $id => $mail) {
            $this->mailIds[spl_object_id($mail)] = (string) $id;
        }

        $this->counts['new'] = count($fresh);

        if ($fresh !== []) {
            Log::info('[GMAIL API] Fetched '.count($fresh).' new emails for inbox '.$this->channel->inbox->id);
        }

        return array_values($fresh);
    }

    public function acknowledge(MailPresenter $mail): void
    {
        $id = $this->mailIds[spl_object_id($mail)] ?? null;

        if ($id !== null) {
            $this->completedIds[$id] = true;
        }
    }

    public function commitSyncProgress(): void
    {
        if ($this->nextHistoryId === null) {
            return;
        }

        $unfinished = array_values(array_filter($this->selectedIds, fn (string $id) => ! isset($this->completedIds[$id])));
        $pending = array_values(array_unique([
            ...array_diff($this->previousPendingIds(), $this->selectedIds),
            ...$unfinished,
            ...$this->deferredIds,
        ]));

        $this->channel->forceFill(['imap_sync_state' => [
            'driver' => self::STATE_DRIVER,
            'history_id' => $this->nextHistoryId,
            'pending_ids' => $pending,
        ]])->saveQuietly();
    }

    /** @return list<string> */
    private function newMessageIds(): array
    {
        $historyId = $this->previousState()['history_id'] ?? null;

        if (filled($historyId)) {
            $ids = $this->messageIdsAddedSince((string) $historyId);

            if ($ids !== null) {
                return $ids;
            }
        }

        return $this->recentMessageIds();
    }

    /** @return list<string>|null null khi Gmail không còn giữ lịch sử từ mốc đó (phải đồng bộ lại cửa sổ gần đây) */
    private function messageIdsAddedSince(string $historyId): ?array
    {
        $ids = [];
        $pageToken = null;

        do {
            $response = $this->get('/history', array_filter([
                'startHistoryId' => $historyId,
                'historyTypes' => 'messageAdded',
                'labelId' => 'INBOX',
                'pageToken' => $pageToken,
            ]), allowNotFound: true);

            if ($response->notFound()) {
                return null;
            }

            foreach ((array) $response->json('history', []) as $record) {
                foreach ((array) ($record['messagesAdded'] ?? []) as $added) {
                    $ids[] = (string) $added['message']['id'];
                }
            }

            $this->nextHistoryId = (string) ($response->json('historyId') ?? $historyId);
            $pageToken = $response->json('nextPageToken');
        } while (filled($pageToken));

        return array_values(array_unique($ids));
    }

    /** @return list<string> thư INBOX trong cửa sổ `interval` ngày, cũ trước mới sau */
    private function recentMessageIds(): array
    {
        // Lấy mốc trước khi liệt kê: thư tới giữa hai lệnh sẽ có trong lượt history kế tiếp.
        $this->nextHistoryId = (string) $this->get('/profile')->json('historyId');

        $messages = (array) $this->get('/messages', [
            'labelIds' => 'INBOX',
            'q' => 'newer_than:'.max($this->interval, 1).'d',
            'maxResults' => self::MAX_MESSAGES_PER_SYNC,
        ])->json('messages', []);

        return array_reverse(array_map(fn (array $message) => (string) $message['id'], $messages));
    }

    /**
     * Thư tải hỏng tạm thời (429, 5xx, hết giờ) hoặc chưa kịp tải trước DOWNLOAD_BUDGET_SECONDS
     * không làm hỏng cả lượt: chúng không được đánh dấu xong nên sang lượt sau thử lại. Gmail báo
     * quá tốc độ thì ngừng tải các nhóm còn lại của lượt này. Chỉ 401 (quyền bị thu hồi) dừng cả lượt.
     *
     * @param  list<string>  $ids
     * @return array<string, string> id thư => nội dung RFC822; thư đã bị xoá khỏi Gmail coi như xong
     */
    private function rawMessages(array $ids): array
    {
        $raws = [];
        $failures = 0;

        $rateLimited = false;

        foreach (array_chunk($ids, self::PARALLEL_DOWNLOADS) as $chunk) {
            if ($rateLimited || $this->startedAt?->diffInSeconds(CarbonImmutable::now()) >= self::DOWNLOAD_BUDGET_SECONDS) {
                break;
            }

            $token = $this->accessToken();
            $responses = Http::pool(fn (Pool $pool) => array_map(
                fn (string $id) => $pool->as($id)->withToken($token)->timeout(self::TIMEOUT_SECONDS)
                    ->get(self::API_URL.'/messages/'.$id, ['format' => 'raw']),
                $chunk,
            ));

            foreach ($chunk as $id) {
                $response = $responses[$id] ?? null;

                if ($response instanceof Response && $response->notFound()) {
                    $this->completedIds[$id] = true;
                } elseif ($response instanceof Response && $response->successful()) {
                    $raws[$id] = self::decodeBase64Url((string) $response->json('raw'));
                } elseif ($response instanceof Response && $response->status() === 401) {
                    $this->checked($response);
                } else {
                    $failures++;
                    $rateLimited = $rateLimited || ($response instanceof Response && in_array($response->status(), self::RATE_LIMIT_STATUSES, true));
                }
            }
        }

        if ($failures > 0) {
            Log::warning("[GMAIL API] {$failures} emails failed to download for inbox {$this->channel->inbox->id}, retrying next sync", ['rate_limited' => $rateLimited]);
        }

        return $raws;
    }

    /** @param  array<string, mixed>  $query */
    private function get(string $path, array $query = [], bool $allowNotFound = false): Response
    {
        try {
            $response = Http::withToken($this->accessToken())->timeout(self::TIMEOUT_SECONDS)->get(self::API_URL.$path, $query);
        } catch (ConnectionException $exception) {
            throw $this->failure(MailServerException::CONNECTION, $exception);
        }

        return $allowNotFound && $response->notFound() ? $response : $this->checked($response);
    }

    private function checked(Response $response): Response
    {
        if ($response->successful()) {
            return $response;
        }

        $cause = new RuntimeException("Gmail API HTTP {$response->status()}: ".mb_substr($response->body(), 0, 300));

        // 401 với access token vừa làm mới = quyền đã bị thu hồi; còn lại (429, 5xx...) là trục trặc tạm thời.
        throw $this->failure($response->status() === 401 ? MailServerException::AUTHENTICATION : MailServerException::CONNECTION, $cause);
    }

    private function reportSlowFetch(): void
    {
        $totalMs = (int) $this->startedAt?->diffInMilliseconds(CarbonImmutable::now());

        if ($totalMs < config('mail.imap_slow_fetch_ms')) {
            return;
        }

        Log::warning('[GMAIL API] Slow fetch for inbox '.$this->channel->inbox->id, ['total_ms' => $totalMs, ...$this->counts]);
    }

    private function accessToken(): string
    {
        return $this->tokens->accessToken($this->channel);
    }

    private function failure(string $reason, ?Throwable $cause): MailServerException
    {
        return new MailServerException($reason, 'gmail', self::HOST, self::PORT, $cause);
    }

    /** @return array<string, mixed> */
    private function previousState(): array
    {
        $state = (array) $this->channel->imap_sync_state;

        return ($state['driver'] ?? null) === self::STATE_DRIVER ? $state : [];
    }

    /** @return list<string> */
    private function previousPendingIds(): array
    {
        return array_values(array_map('strval', (array) ($this->previousState()['pending_ids'] ?? [])));
    }

    /** @return list<string> */
    private function requestedRetries(): array
    {
        return array_slice($this->previousPendingIds(), 0, self::RETRIES_PER_SYNC);
    }

    private static function decodeBase64Url(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
