<?php

namespace App\Services\Imap;

use App\Models\Inbox;
use Illuminate\Support\Facades\Redis;

// Nhớ trong 2 ngày những message-id đã xử lý rồi bị xóa, để lần quét sau không tạo lại.
class DeletedMessageTracker
{
    private const TTL_SECONDS = 172800;

    public function __construct(private readonly Inbox $inbox) {}

    /** @param list<string> $sourceIds */
    public function record(array $sourceIds): void
    {
        if (! $this->inbox->isEmail()) {
            return;
        }

        $sourceIds = array_values(array_unique(array_filter($sourceIds)));

        if ($sourceIds === []) {
            return;
        }

        foreach ($sourceIds as $sourceId) {
            Redis::setex($this->redisKey($sourceId), self::TTL_SECONDS, true);
        }
    }

    public function isDeleted(string $sourceId): bool
    {
        return in_array($sourceId, $this->deletedIds([$sourceId]), true);
    }

    /** @param list<string> $sourceIds
     * @return list<string>
     */
    public function deletedIds(array $sourceIds): array
    {
        $sourceIds = array_values(array_unique(array_filter($sourceIds)));

        if ($sourceIds === []) {
            return [];
        }

        $legacyValues = Redis::mget(array_map(fn (string $id) => $this->redisKey($id), $sourceIds));

        return array_values(array_filter($sourceIds, fn (string $id, int $index) => filled($legacyValues[$index] ?? null), ARRAY_FILTER_USE_BOTH));
    }

    private function redisKey(string $sourceId): string
    {
        return 'IMAP_DELETED_MESSAGE::'.$this->inbox->id.'::'.hash('sha256', $sourceId);
    }
}
