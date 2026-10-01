<?php

namespace App\Channels;

use App\Models\Account;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * Danh sách lối vào của màn "Thêm kênh", gom từ chính các driver kênh (sổ đăng ký là
 * morph map). Nhiều driver có thể chung một lối vào (WhatsApp Cloud + Twilio); lối vào
 * mở khi có ít nhất một driver mở. Thêm kênh = thêm driver khai DeclaresConnection.
 */
final class ChannelConnectionCatalog
{
    /** @return array<string, ChannelConnection> key => lối vào, đã gom và xếp thứ tự */
    public static function all(): array
    {
        $entries = [];

        foreach (self::drivers() as $driver) {
            $connection = $driver::connection();
            $existing = $entries[$connection->key] ?? null;

            if ($existing === null) {
                $entries[$connection->key] = $connection;

                continue;
            }

            $entries[$connection->key] = $existing->available(
                $existing->available || $connection->available,
            )->ordered(min($existing->order, $connection->order));
        }

        uasort($entries, static fn (ChannelConnection $a, ChannelConnection $b) => [$a->order, $a->key] <=> [$b->order, $b->key]);

        return $entries;
    }

    /** @return list<ChannelConnection> */
    public static function available(): array
    {
        return array_values(array_filter(self::all(), static fn (ChannelConnection $entry) => $entry->available));
    }

    public static function find(string $key): ?ChannelConnection
    {
        return self::all()[$key] ?? null;
    }

    /** @return list<array<string, mixed>> */
    public static function availableFor(Account $account): array
    {
        return array_map(static fn (ChannelConnection $entry) => $entry->toArray($account), self::available());
    }

    /** @return list<class-string<DeclaresConnection>> */
    public static function drivers(): array
    {
        return array_values(array_filter(
            Relation::morphMap(),
            static fn (string $class, string $type) => str_starts_with($type, 'Channel::') && is_subclass_of($class, DeclaresConnection::class),
            ARRAY_FILTER_USE_BOTH,
        ));
    }
}
