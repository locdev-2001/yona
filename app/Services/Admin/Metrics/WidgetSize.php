<?php

namespace App\Services\Admin\Metrics;

// Độ rộng ô widget trên lưới 4 cột của trang Tổng quan.
enum WidgetSize: string
{
    case Small = 'sm';
    case Medium = 'md';
    case Large = 'lg';
    case Full = 'full';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $size) => $size->value, self::cases());
    }
}
