<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use RuntimeException;
use Throwable;

abstract class TestCase extends BaseTestCase
{
    /**
     * Chỉ số redis mà phpunit.xml khai (`REDIS_DB`). Chỉ khi đang chạy đúng cấu
     * hình test này mới đổi sang chỉ số riêng của tiến trình; redis dev
     * (`REDIS_DB=2`, cache 3) không bao giờ bị đụng dù ai đó chạy test với .env lạ.
     */
    private const TEST_REDIS_DATABASE = 4;

    /**
     * Mỗi tiến trình test (kể cả worker `--parallel` và phiên khác chạy cùng
     * lúc trên máy) giữ riêng MỘT chỉ số trong nhóm này bằng khoá file, nên
     * FLUSHDB, trạng thái trực tuyến, hàng đợi round-robin của tiến trình này
     * không đè lên tiến trình khác. Chỉ số 4 để cuối vì mã test cũ dùng nó mặc định.
     */
    private const TEST_REDIS_DATABASE_POOL = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, self::TEST_REDIS_DATABASE];

    private static ?int $processRedisDatabase = null;

    /** @var resource|null Giữ mở suốt đời tiến trình; hệ điều hành nhả khoá khi tiến trình thoát. */
    private static $processRedisDatabaseLock = null;

    private static bool $redisFlushed = false;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useProcessRedisDatabase();
        $this->flushTestRedisOnce();

        // Test KHÔNG được ra Internet: thiếu Http::fake là đỏ ngay chỗ gọi, thay vì
        // treo theo DNS/timeout của máy chạy (zalo-deep-audit lô 7, mục 2).
        Http::preventStrayRequests();

        $this->withoutVite();
    }

    /**
     * Redis không được reset giữa các lượt chạy nên khoá cũ (hàng đợi round-robin,
     * counter…) làm suite phụ thuộc thứ tự: một test đỏ lần đầu rồi xanh sau khi
     * FLUSHDB (zalo-lo6-notes mục "Cảnh báo môi trường"). Xoá MỘT LẦN cho mỗi tiến
     * trình test, ngay trước test đầu tiên.
     */
    private function flushTestRedisOnce(): void
    {
        if (self::$redisFlushed) {
            return;
        }

        self::$redisFlushed = true;

        if (! app()->environment('testing')) {
            return;
        }

        if (! in_array((int) config('database.redis.default.database'), self::TEST_REDIS_DATABASE_POOL, true)) {
            return;
        }

        try {
            Redis::connection()->flushdb();
        } catch (Throwable) {
            // Không có redis (máy dev tối giản) thì test nào cần redis sẽ tự đỏ ở
            // chỗ của nó — không chặn cả suite ở đây.
        }
    }

    // Ứng dụng dựng lại ở mỗi test nên phải gán lại config ở mỗi test.
    private function useProcessRedisDatabase(): void
    {
        if ((int) config('database.redis.default.database') !== self::TEST_REDIS_DATABASE) {
            return;
        }

        $database = self::$processRedisDatabase ??= self::claimRedisDatabase();

        config([
            'database.redis.default.database' => $database,
            'database.redis.cache.database' => $database,
        ]);
        Redis::purge();
    }

    private static function claimRedisDatabase(): int
    {
        foreach (self::TEST_REDIS_DATABASE_POOL as $database) {
            $lock = fopen(sys_get_temp_dir()."/yona-test-redis-db-{$database}.lock", 'c');

            if ($lock !== false && flock($lock, LOCK_EX | LOCK_NB)) {
                self::$processRedisDatabaseLock = $lock;

                return $database;
            }

            if ($lock !== false) {
                fclose($lock);
            }
        }

        throw new RuntimeException('Hết chỉ số redis cho test: đã có '.count(self::TEST_REDIS_DATABASE_POOL).' tiến trình test đang chạy.');
    }
}
