<?php

namespace App\Services\Calls;

use App\Models\Call;
use Illuminate\Contracts\Cache\Repository as Cache;

// Ai đang chia sẻ màn hình trong một phòng. Không ghi DB (trạng thái nguồn phát là của nhà
// cung cấp media, schema không lưu): giữ trong cache để danh sách hội thoại hiện nhãn trực tiếp.
final readonly class ScreenShares
{
    private const TTL_SECONDS = 12 * 3600;

    public function __construct(private Cache $cache) {}

    /** @return list<int> */
    public function sharerIds(Call $call): array
    {
        return $this->cache->get($this->key($call), []);
    }

    public function start(Call $call, int $userId): void
    {
        $this->put($call, array_values(array_unique([...$this->sharerIds($call), $userId])));
    }

    public function stop(Call $call, int $userId): void
    {
        $this->put($call, array_values(array_diff($this->sharerIds($call), [$userId])));
    }

    public function clear(Call $call): void
    {
        $this->cache->forget($this->key($call));
    }

    /** @param  list<int>  $userIds */
    private function put(Call $call, array $userIds): void
    {
        $this->cache->put($this->key($call), $userIds, self::TTL_SECONDS);
    }

    private function key(Call $call): string
    {
        return "calls:{$call->id}:screen-sharers";
    }
}
