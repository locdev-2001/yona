<?php

namespace App\Services\Admin\Alerts;

enum MetricUnit: string
{
    case Count = 'count';
    case Seconds = 'seconds';
    // 1 = hỏng, 0 = bình thường; ngưỡng cố định 1.
    case State = 'state';
}
