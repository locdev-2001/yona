<?php

namespace App\Services\Admin\Operations\ChannelHealth;

use Carbon\CarbonInterface;

// Một vấn đề của kênh mà driver khai ra. `code` là khoá máy đọc, nhãn hiển thị
// tra ở lang admin_operations.channel_health.problems.<code>. `error` = kênh
// đang không nhận/gửi được; `warning` = còn chạy nhưng đang trục trặc.
final class ChannelProblem
{
    public const ERROR = 'error';

    public const WARNING = 'warning';

    public function __construct(
        public readonly string $code,
        public readonly ?string $detail = null,
        public readonly ?CarbonInterface $since = null,
        public readonly string $severity = self::ERROR,
    ) {}
}
