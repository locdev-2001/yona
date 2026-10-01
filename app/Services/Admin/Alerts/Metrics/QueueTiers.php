<?php

namespace App\Services\Admin\Alerts\Metrics;

// Tên hàng đợi lấy từ nguồn duy nhất config/queue_tiers.php.
final class QueueTiers
{
    /** @return list<string> */
    public static function all(): array
    {
        $tiers = require config_path('queue_tiers.php');

        return array_values(array_filter((array) $tiers, 'is_string'));
    }
}
