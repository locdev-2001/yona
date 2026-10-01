<?php

namespace App\Services\Admin\Operations\ChannelHealth;

use Carbon\CarbonInterface;

// Một vấn đề của kênh mà driver khai ra. `code` là khoá máy đọc, nhãn hiển thị
// tra ở lang admin_operations.channel_health.problems.<code>.
final class ChannelProblem
{
    public function __construct(
        public readonly string $code,
        public readonly ?string $detail = null,
        public readonly ?CarbonInterface $since = null,
    ) {}
}
