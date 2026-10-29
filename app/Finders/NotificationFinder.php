<?php

namespace App\Finders;

use App\Models\Account;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class NotificationFinder
{
    public const RESULTS_PER_PAGE = 15;

    /** @var Builder<Notification> */
    private Builder $notifications;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly User $currentUser,
        private readonly Account $currentAccount,
        private readonly array $params = [],
    ) {
        $this->setUp();
    }

    /** @return Collection<int, Notification> */
    public function notifications(): Collection
    {
        return (clone $this->notifications)
            ->orderBy('last_activity_at', $this->sortOrder())
            ->offset(($this->currentPage() - 1) * self::RESULTS_PER_PAGE)
            ->limit(self::RESULTS_PER_PAGE)
            ->get();
    }

    public function count(): int
    {
        return (clone $this->notifications)->count();
    }

    public function currentPage(): int
    {
        return max(1, (int) ($this->params['page'] ?? 1));
    }

    private function setUp(): void
    {
        $this->notifications = Notification::query()
            ->where('user_id', $this->currentUser->id)
            ->where('account_id', $this->currentAccount->id);

        if (! $this->typeIncluded('snoozed')) {
            $this->notifications->whereNull('snoozed_until');
        }

        if (! $this->typeIncluded('read')) {
            $this->notifications->unread();
        }

        if (is_array($this->params['inbox_ids'] ?? null)) {
            $this->notifications->forInboxes($this->params['inbox_ids']);
        }
    }

    private function typeIncluded(string $type): bool
    {
        $includes = $this->params['includes'] ?? [];

        return is_array($includes) && in_array($type, $includes, true);
    }

    private function sortOrder(): string
    {
        return ($this->params['sort_order'] ?? null) === 'asc' ? 'asc' : 'desc';
    }
}
