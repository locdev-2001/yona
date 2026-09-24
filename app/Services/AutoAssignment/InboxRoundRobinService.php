<?php

namespace App\Services\AutoAssignment;

use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Redis;

// + khóa ROUND_ROBIN_AGENTS của lib/redis/redis_keys.rb.
// Hàng đợi Redis là list: lấy agent ở CUỐI hàng, đẩy lại lên ĐẦU → vòng tròn.
final class InboxRoundRobinService
{
    public const ROUND_ROBIN_AGENTS = 'ROUND_ROBIN_AGENTS:%d';

    public function __construct(private readonly Inbox $inbox) {}

    public function clearQueue(): void
    {
        Redis::del($this->roundRobinKey());
    }

    /** @param int|list<int> $userIds */
    public function addAgentToQueue(int|array $userIds): void
    {
        $values = array_map('strval', (array) $userIds);

        if ($values === []) {
            return;
        }

        Redis::lpush($this->roundRobinKey(), ...$values);
    }

    public function removeAgentFromQueue(int|string $userId): void
    {
        Redis::lrem($this->roundRobinKey(), 0, (string) $userId);
    }

    public function resetQueue(): void
    {
        $userIds = $this->memberIds();
        $this->clearQueue();
        $this->addAgentToQueue($userIds);
    }

    /** @param list<string> $allowedAgentIds id dạng chuỗi (giao với danh sách agent online) */
    public function availableAgent(array $allowedAgentIds = []): ?User
    {
        if (! $this->isQueueValid()) {
            $this->resetQueue();
        }

        $userId = $this->memberFromAllowedAgentIds($allowedAgentIds);

        if ($userId === null) {
            return null;
        }

        return $this->inbox->inboxMembers()->where('user_id', $userId)->first()?->user;
    }

    /** @param list<string> $allowedAgentIds */
    private function memberFromAllowedAgentIds(array $allowedAgentIds): ?string
    {
        if ($allowedAgentIds === []) {
            return null;
        }

        $matches = array_values(array_unique(array_intersect($this->queue(), $allowedAgentIds)));
        $userId = array_pop($matches);

        if ($userId === null) {
            return null;
        }

        $this->removeAgentFromQueue($userId);
        $this->addAgentToQueue((int) $userId);

        return $userId;
    }

    private function isQueueValid(): bool
    {
        $memberIds = $this->memberIds();
        $queueIds = array_map('intval', $this->queue());
        sort($memberIds);
        sort($queueIds);

        return $memberIds === $queueIds;
    }

    /** @return list<string> */
    private function queue(): array
    {
        return array_map('strval', Redis::lrange($this->roundRobinKey(), 0, -1));
    }

    /** @return list<int> */
    private function memberIds(): array
    {
        return $this->inbox->inboxMembers()->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }

    private function roundRobinKey(): string
    {
        return sprintf(self::ROUND_ROBIN_AGENTS, $this->inbox->id);
    }
}
