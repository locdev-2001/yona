<?php

namespace App\Models\Channel;

use Illuminate\Support\Str;

// enum reply_time: { in_a_few_minutes: 0, in_a_few_hours: 1, in_a_day: 2 } của
// Channel::WebWidget — DB lưu số, API đọc/ghi bằng khóa snake_case như Rails.
enum ReplyTime: int
{
    case InAFewMinutes = 0;
    case InAFewHours = 1;
    case InADay = 2;

    public function key(): string
    {
        return Str::snake($this->name);
    }

    public static function fromKey(string $key): self
    {
        foreach (self::cases() as $case) {
            if ($case->key() === $key) {
                return $case;
            }
        }

        throw new \ValueError("'{$key}' is not a valid reply_time");
    }

    public static function coerce(self|int|string $value): self
    {
        return match (true) {
            $value instanceof self => $value,
            is_int($value) => self::from($value),
            default => is_numeric($value) ? self::from((int) $value) : self::fromKey($value),
        };
    }
}
