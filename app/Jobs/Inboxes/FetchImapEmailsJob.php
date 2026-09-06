<?php

namespace App\Jobs\Inboxes;

use App\Jobs\ApplicationJob;
use App\Mailboxes\ImapMailbox;
use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Services\Imap\FetchEmailService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Port từ refs/chatwoot/app/jobs/inboxes/fetch_imap_emails_job.rb — quét hộp thư
 * của một kênh. Khóa 5 phút để hai worker không quét trùng (MutexApplicationJob),
 * thư nào lỗi 3 lần liên tiếp thì bỏ qua trong 6 tiếng.
 */
class FetchImapEmailsJob extends ApplicationJob
{
    private const LOCK_SECONDS = 300;

    private const MAX_FAILURES_PER_EMAIL = 3;

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

        $lock = Cache::lock('EMAIL_MESSAGE_MUTEX::'.$this->channel->inbox->id, self::LOCK_SECONDS);

        if (! $lock->get()) {
            Log::error('[IMAP] Lock failed for '.$this->channel->inbox->id);

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
            $emails = (new FetchEmailService($this->channel, $this->interval))->perform();
        } catch (Throwable $exception) {
            Log::error('[IMAP] Error for email channel - '.$this->channel->inbox->id.' : '.$exception->getMessage());

            return;
        }

        foreach ($emails as $email) {
            $this->processMail($email);
        }
    }

    private function processMail(MailPresenter $mail): void
    {
        $messageId = (string) $mail->messageId();

        if ($this->failureCount($messageId) >= self::MAX_FAILURES_PER_EMAIL) {
            Log::warning('[IMAP] Skipping problematic email: '.$messageId);

            return;
        }

        try {
            (new ImapMailbox)->process($mail, $this->channel);
        } catch (Throwable $exception) {
            Cache::put($this->failureKey($messageId), $this->failureCount($messageId) + 1, now()->addHours(6));
            Log::error('[IMAP] Failed to process email '.$messageId.': '.$exception->getMessage());
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
