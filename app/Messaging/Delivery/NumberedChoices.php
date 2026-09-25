<?php

namespace App\Messaging\Delivery;

use App\Messaging\Structured\Choice;

/** "Nhắn số tương ứng để chọn:\n1. Có\n2. Không" — cho kênh không có chip/nút gốc. */
final class NumberedChoices
{
    /** @param list<Choice> $choices */
    public static function render(array $choices): string
    {
        $lines = array_map(
            fn (Choice $choice, int $index) => ($index + 1).'. '.$choice->label,
            $choices,
            array_keys($choices),
        );

        return __('messaging.delivery.numbered_prompt')."\n".implode("\n", $lines);
    }
}
