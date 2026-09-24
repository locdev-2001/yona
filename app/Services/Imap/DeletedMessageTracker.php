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

        foreach (array_filter($sourceIds) as $sourceId) {
            Redis::setex($this->redisKey($sourceId), self::TTL_SECONDS, true);
        }
    }

    public function isDeleted(string $sourceId): bool
    {
        return (bool) Redis::exists($this->redisKey($sourceId));
    }

    private function redisKey(string $sourceId): string
    {
        return 'IMAP_DELETED_MESSAGE::'.$this->inbox->id.'::'.hash('sha256', $sourceId);
    }
}
