<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Contracts');

/**
 * Mẫu URL của cầu nối Zalo cho `Http::fake`, lấy từ chính cấu hình ứng dụng.
 *
 * Ghi cứng `127.0.0.1:3710` trong test làm cả suite đỏ ngay khi đổi cổng dự án,
 * và nguy hiểm hơn: fake trượt thì lời gọi đi thẳng vào cầu nối THẬT đang giữ
 * phiên Zalo của founder.
 */
function zaloBridgePattern(string $path = '*'): string
{
    $host = preg_replace('#^https?://#', '', rtrim((string) config('zalo.bridge.url'), '/'));

    return $host.'/'.ltrim($path, '/');
}
