<?php

namespace App\Support;

use App\Models\Account;
use Illuminate\Support\Facades\Redis;

// Port từ refs/chatwoot/lib/online_status_tracker.rb + key ONLINE_* của
// lib/redis/redis_keys.rb. Presence = sorted set (score = unix time, member =
// id); status online|busy|offline = hash {user_id => status}.
final class OnlineStatusTracker
{
    public const ONLINE_STATUS = 'ONLINE_STATUS::%d';

    public const ONLINE_PRESENCE_CONTACTS = 'ONLINE_PRESENCE::%d::CONTACTS';

    public const ONLINE_PRESENCE_USERS = 'ONLINE_PRESENCE::%d::USERS';

    public static function updatePresence(int $accountId, string $objType, int $objId): void
    {
        Redis::zadd(self::presenceKey($accountId, $objType), now()->getTimestamp(), (string) $objId);
    }

    public static function getPresence(int $accountId, string $objType, int $objId): bool
    {
        $connectedTime = Redis::zscore(self::presenceKey($accountId, $objType), (string) $objId);

        if ($connectedTime === false || $connectedTime === null) {
            return false;
        }

        return (int) $connectedTime > now()->getTimestamp() - self::presenceDuration($objType);
    }

    public static function presenceKey(int $accountId, string $objType): string
    {
        return sprintf($objType === 'Contact' ? self::ONLINE_PRESENCE_CONTACTS : self::ONLINE_PRESENCE_USERS, $accountId);
    }

    public static function setStatus(int $accountId, int $userId, string $status): void
    {
        Redis::hset(self::statusKey($accountId), (string) $userId, $status);
    }

    public static function getStatus(int $accountId, int $userId): ?string
    {
        $status = Redis::hget(self::statusKey($accountId), (string) $userId);

        return is_string($status) && $status !== '' ? $status : null;
    }

    public static function statusKey(int $accountId): string
    {
        return sprintf(self::ONLINE_STATUS, $accountId);
    }

    /** @return list<string> */
    public static function getAvailableContactIds(int $accountId): array
    {
        $key = self::presenceKey($accountId, 'Contact');
        $rangeStart = now()->getTimestamp() - self::presenceDuration('Contact');

        // Dọn bản ghi cũ để sorted set không phình; "(" = exclusive.
        Redis::zremrangebyscore($key, '-inf', '('.$rangeStart);

        return array_map('strval', Redis::zrangebyscore($key, (string) $rangeStart, '+inf'));
    }

    // Key id là số → PHP ép về int (JSON vẫn ra {"12": "online"} như gốc).
    /** @return array<int, string> {contact_id => 'online'} */
    public static function getAvailableContacts(int $accountId): array
    {
        return array_fill_keys(self::getAvailableContactIds($accountId), 'online');
    }

    /** @return array<int, string> {user_id => availability} */
    public static function getAvailableUsers(int $accountId): array
    {
        $userIds = self::getAvailableUserIds($accountId);

        if ($userIds === []) {
            return [];
        }

        // phpredis trả map field=>value, predis trả list — array_values ép về
        // list cùng thứ tự với $userIds.
        $statuses = array_values((array) Redis::hmget(self::statusKey($accountId), $userIds));
        $availabilities = [];

        foreach ($userIds as $index => $userId) {
            $status = $statuses[$index] ?? null;
            $availabilities[$userId] = is_string($status) && $status !== ''
                ? $status
                : self::getAvailabilityFromDb($accountId, (int) $userId);
        }

        return $availabilities;
    }

    public static function clearAccount(int $accountId): void
    {
        Redis::del(
            self::presenceKey($accountId, 'User'),
            self::presenceKey($accountId, 'Contact'),
            self::statusKey($accountId),
        );
    }

    private static function getAvailabilityFromDb(int $accountId, int $userId): string
    {
        $availability = Account::query()->findOrFail($accountId)
            ->accountUsers()->where('user_id', $userId)->firstOrFail()
            ->availabilityName();

        self::setStatus($accountId, $userId, $availability);

        return $availability;
    }

    /** @return list<string> */
    private static function getAvailableUserIds(int $accountId): array
    {
        $account = Account::query()->findOrFail($accountId);
        $rangeStart = now()->getTimestamp() - self::presenceDuration('User');

        $userIds = array_map('strval', Redis::zrangebyscore(self::presenceKey($accountId, 'User'), (string) $rangeStart, '+inf'));
        $alwaysOnlineIds = $account->accountUsers()->where('auto_offline', false)->pluck('user_id')->map(fn ($id) => (string) $id)->all();

        return array_values(array_unique([...$userIds, ...$alwaysOnlineIds]));
    }

    private static function presenceDuration(string $objType): int
    {
        return (int) config($objType === 'Contact' ? 'yona.contact_presence_duration' : 'yona.presence_duration');
    }
}
