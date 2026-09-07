<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Throwable;

abstract class TestCase extends BaseTestCase
{
    /**
     * Chỉ số redis dành riêng cho test — khai trong phpunit.xml (`REDIS_DB`).
     * Suite chỉ được xoá đúng chỉ số này; redis dev (`REDIS_DB=2`) không bao giờ
     * bị đụng dù ai đó chạy test với .env lạ.
     */
    private const TEST_REDIS_DATABASE = 4;

    private static bool $redisFlushed = false;

    protected function setUp(): void
    {
        parent::setUp();

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

        if ((int) config('database.redis.default.database') !== self::TEST_REDIS_DATABASE) {
            return;
        }

        try {
            Redis::connection()->flushdb();
        } catch (Throwable) {
            // Không có redis (máy dev tối giản) thì test nào cần redis sẽ tự đỏ ở
            // chỗ của nó — không chặn cả suite ở đây.
        }
    }
}
