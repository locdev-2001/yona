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
 */
class FetchImapEmailsJob extends ApplicationJob
{
    private const LOCK_SECONDS = 150;

    private const MAX_FAILURES_PER_EMAIL = 3;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public function __construct(
        public readonly Email $channel,
        public readonly int $interval = 1,
    ) {}

    public function handle(): void
    {
        if (! $this->shouldFetchEmail()) {
            Log::info('[IMAP] Skipping fetch for inbox '.$this->channel->inbox->id
                .' : imap_enabled: '.var_export($this->channel->imap_enabled, true)
                .', reauthorization_required: '.var_export($this->channel->reauthorizationRequired(), true));

            return;
        }

        if (! $this->channel->syncBackoff()->ready()) {
            return;
        }

        $lock = Cache::lock('EMAIL_MESSAGE_MUTEX::'.$this->channel->inbox->id, self::LOCK_SECONDS);

        // Lượt quét trước của hộp thư này chưa xong: bỏ lượt này, không phải lỗi.
        if (! $lock->get()) {
            Log::info('[IMAP] Previous fetch still running for inbox '.$this->channel->inbox->id.', skipping');

            return;
        }

        try {
            $this->processEmailsForChannel();
        } finally {
            $lock->release();
        }
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
