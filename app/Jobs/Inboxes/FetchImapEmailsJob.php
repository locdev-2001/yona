<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Mailboxes\ImapMailbox;
use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Email\MailServerException;
use App\Services\Imap\FetchEmailService;
use App\Services\ProductEvents\ProductEventHooks;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Quét hộp thư
 * của một kênh. Khóa 150 giây, dài hơn timeout job 120 giây, để hai worker không quét trùng;
 * thư nào lỗi 3 lần liên tiếp thì bỏ qua trong 6 tiếng.
 *
 * Báo "có thư mới" (`requestFetch`) gộp lại: đã có lượt đang chờ hoặc đang quét thì chỉ đặt
 * cờ quét lại, lượt đó quét xong thấy cờ thì xếp thêm đúng một lượt cuối, không rơi thư nào.
 */
class FetchImapEmailsJob extends ApplicationJob
{
    private const LOCK_SECONDS = 150;

    private const MAX_FAILURES_PER_EMAIL = 3;

    private const RESCAN_DELAY_SECONDS = 2;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public function __construct(
        public readonly Email $channel,
        public readonly int $interval = 1,
    ) {}

    /** Xếp một lượt quét ngay, hoặc hẹn lượt quét lại nếu đã có lượt đang chờ/đang quét. */
    public static function requestFetch(Email $channel, int $delaySeconds = 0): void
    {
        // Cờ đặt trước: lượt đang chạy luôn thấy được nó khi xong (xem handle()).
        Cache::put(self::rescanKey($channel), true, self::LOCK_SECONDS);

        if (Cache::add(self::pendingKey($channel), true, self::LOCK_SECONDS)) {
            Cache::forget(self::rescanKey($channel));
            self::dispatch($channel)->delay($delaySeconds);
        }
    }

    public function handle(): void
    {
        if (! $this->shouldFetchEmail()) {
            Log::info('[IMAP] Skipping fetch for inbox '.$this->channel->inbox->id
                .' : imap_enabled: '.var_export($this->channel->imap_enabled, true)
                .', reauthorization_required: '.var_export($this->channel->reauthorizationRequired(), true));
            $this->forgetFetchRequests();

            return;
        }

        if (! $this->channel->syncBackoff()->ready()) {
            $this->forgetFetchRequests();

            return;
        }

        // Cờ đặt trước khi giành khoá: lượt đang giữ khoá nhả khoá xong mới đọc cờ nên không lỡ.
        Cache::put(self::rescanKey($this->channel), true, self::LOCK_SECONDS);
        $lock = Cache::lock('EMAIL_MESSAGE_MUTEX::'.$this->channel->inbox->id, self::LOCK_SECONDS);

        // Lượt quét trước của hộp thư này chưa xong: lượt đó sẽ quét lại theo cờ, không phải lỗi.
        if (! $lock->get()) {
            Log::info('[IMAP] Previous fetch still running for inbox '.$this->channel->inbox->id.', rescan queued');

            return;
        }

        Cache::forget(self::rescanKey($this->channel));

        try {
            $this->processEmailsForChannel();
        } finally {
            $lock->release();
            Cache::forget(self::pendingKey($this->channel));

            if (Cache::pull(self::rescanKey($this->channel))) {
                self::requestFetch($this->channel, self::RESCAN_DELAY_SECONDS);
            }
        }
    }

    private function forgetFetchRequests(): void
    {
        Cache::forget(self::pendingKey($this->channel));
        Cache::forget(self::rescanKey($this->channel));
    }

    private static function pendingKey(Email $channel): string
    {
        return 'email_fetch_pending:'.$channel->getKey();
    }

    private static function rescanKey(Email $channel): string
    {
        return 'email_fetch_rescan_pending:'.$channel->getKey();
    }

    private function shouldFetchEmail(): bool
    {
        return $this->channel->imap_enabled && ! $this->channel->reauthorizationRequired();
    }

    private function processEmailsForChannel(): void
    {
        try {
            $fetcher = app(FetchEmailService::class, ['channel' => $this->channel, 'interval' => $this->interval]);
            $emails = $fetcher->perform();
        } catch (MailServerException $exception) {
            Log::warning('[IMAP] Connection failed for inbox '.$this->channel->inbox->id.' : '.$exception->getMessage());
            $this->channel->recordConnectionFailure($exception);

            return;
        } catch (Throwable $exception) {
            Log::error('[IMAP] Error for email channel - '.$this->channel->inbox->id.' : '.$exception->getMessage());

            return;
        }

        $this->channel->reauthorized();

        // Lấy thư thành công lần đầu = IMAP đã nối được (chống trùng theo hộp thư).
        app(ProductEventHooks::class)->channelConnected($this->channel->inbox, 'imap');

        foreach ($emails as $email) {
            if ($this->processMail($email)) {
                $fetcher->acknowledge($email);
            }
        }

        $fetcher->commitSyncProgress();
    }

    private function processMail(MailPresenter $mail): bool
    {
        $messageId = (string) $mail->messageId();

        if ($this->failureCount($messageId) >= self::MAX_FAILURES_PER_EMAIL) {
            Log::warning('[IMAP] Skipping problematic email: '.$messageId);

            return false;
        }

        try {
            (new ImapMailbox)->process($mail, $this->channel);

            Cache::forget($this->failureKey($messageId));

            return true;
        } catch (Throwable $exception) {
            Cache::put($this->failureKey($messageId), $this->failureCount($messageId) + 1, now()->addHours(6));
            Log::error('[IMAP] Failed to process email '.$messageId.': '.$exception->getMessage());

            return false;
        }
    }

    private function failureCount(string $messageId): int
    {
        return (int) Cache::get($this->failureKey($messageId), 0);
    }

    private function failureKey(string $messageId): string
    {
        return 'email_failures:'.$messageId;
    }
}
