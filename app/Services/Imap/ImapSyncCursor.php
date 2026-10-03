<?php

namespace App\Services\Imap;

use App\Models\Channel\Email;

final class ImapSyncCursor
{
    private const RETRIES_PER_SYNC = 100;

    private array $completed = [];

    private array $selectedUids = [];

    private readonly array $previous;

    private readonly string $identity;

    private array $missingRetries = [];

    public function __construct(private readonly Email $channel, private readonly array $folder)
    {
        $this->previous = (array) $channel->imap_sync_state;
        $this->identity = hash('sha256', json_encode([$channel->imap_address, $channel->imap_port, $channel->imap_login, $channel->imap_enable_ssl, 'INBOX']));
    }

    public function criteria(string $since): array
    {
        if ($this->continuing()) {
            return ['UID '.implode(',', [...$this->requestedRetries(), ($this->lastUid() + 1).':*'])];
        }

        return $this->sameMailbox() && $this->previous !== [] ? ['ALL'] : ['SINCE "'.$since.'"'];
    }

    public function select(array $uids): array
    {
        $uids = array_values(array_unique(array_map('intval', $uids)));
        sort($uids, SORT_NUMERIC);
        $requestedRetries = $this->requestedRetries();
        $retries = array_values(array_intersect($requestedRetries, $uids));
        $this->missingRetries = array_diff($requestedRetries, $uids);
        $newUids = array_values(array_filter($uids, fn (int $uid) => $uid > $this->lastUid()));
        $this->selectedUids = array_slice(array_values(array_unique([...$retries, ...$newUids])), 0, FetchEmailService::MAX_MESSAGES_PER_SYNC);

        return $this->selectedUids;
    }

    public function completed(int $uid): void
    {
        $this->completed[$uid] = true;
    }

    public function checkpoint(): void
    {
        $validity = (int) ($this->folder['uidvalidity'] ?? 0);

        if ($validity < 1) {
            return;
        }

        $lastUid = max($this->lastUid(), ...($this->selectedUids ?: [0]));
        $pending = array_values(array_diff($this->pendingUids(), $this->selectedUids, $this->missingRetries));
        $pending = [...$pending, ...array_values(array_diff($this->selectedUids, array_keys($this->completed)))];

        if ($this->selectedUids === [] && ! $this->continuing()) {
            $lastUid = max(0, (int) ($this->folder['uidnext'] ?? 1) - 1);
        }

        $this->channel->forceFill(['imap_sync_state' => [
            'identity' => $this->identity,
            'uidvalidity' => $validity,
            'last_uid' => $lastUid,
            'pending_uids' => $pending,
        ]])->saveQuietly();
    }

    private function sameMailbox(): bool
    {
        return ($this->previous['identity'] ?? null) === $this->identity;
    }

    private function continuing(): bool
    {
        return $this->sameMailbox()
            && (int) ($this->folder['uidvalidity'] ?? 0) > 0
            && ($this->previous['uidvalidity'] ?? null) === (int) $this->folder['uidvalidity'];
    }

    private function lastUid(): int
    {
        return $this->continuing() ? (int) ($this->previous['last_uid'] ?? 0) : 0;
    }

    private function pendingUids(): array
    {
        return $this->continuing() ? (array) ($this->previous['pending_uids'] ?? []) : [];
    }

    private function requestedRetries(): array
    {
        return array_slice($this->pendingUids(), 0, self::RETRIES_PER_SYNC);
    }
}
