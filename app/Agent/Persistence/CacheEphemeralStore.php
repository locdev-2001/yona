<?php

namespace App\Agent\Persistence;

use App\Agent\Contracts\Ports\EphemeralStore;
use Illuminate\Contracts\Cache\Repository;

final class CacheEphemeralStore implements EphemeralStore
{
    private const PREFIX = 'agent:';

    public function __construct(private readonly Repository $cache) {}

    public function add(string $key, int $value, int $ttlSeconds): bool
    {
        return $this->cache->add(self::PREFIX.$key, $value, $ttlSeconds);
    }

    public function put(string $key, int $value, int $ttlSeconds): void
    {
        $this->cache->put(self::PREFIX.$key, $value, $ttlSeconds);
    }

    public function get(string $key): ?int
    {
        $value = $this->cache->get(self::PREFIX.$key);

        return is_numeric($value) ? (int) $value : null;
    }
}
