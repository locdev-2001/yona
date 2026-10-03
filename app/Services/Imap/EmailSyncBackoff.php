<?php

namespace App\Services\Imap;

use Illuminate\Support\Facades\Cache;

final class EmailSyncBackoff
{
    public function __construct(private readonly int $channelId) {}

    public function retryAt(): int
    {
        return (int) ($this->state()['retry_at'] ?? 0);
    }

    public function ready(): bool
    {
        return $this->retryAt() <= now()->timestamp;
    }

    public function failed(): void
    {
        $failures = min(10, (int) ($this->state()['failures'] ?? 0) + 1);
        $delay = min((int) config('mail.imap_retry_max_seconds'), 60 * (2 ** ($failures - 1)));

        Cache::forever($this->key(), [
            'failures' => $failures,
            'retry_at' => now()->timestamp + $delay + random_int(0, 15),
        ]);
    }

    public function recovered(): void
    {
        Cache::forget($this->key());
    }

    private function state(): array
    {
        return (array) Cache::get($this->key(), []);
    }

    private function key(): string
    {
        return 'EMAIL_SYNC_BACKOFF::'.$this->channelId;
    }
}
