<?php

namespace App\Services\Reports;

use DateTimeImmutable;
use DateTimeZone;

/**
 * và `ActiveSupport::TimeZone[<số>]`.
 *
 * FE chỉ gửi độ lệch giờ; bản gốc quét danh sách vùng của ActiveSupport theo
 * đúng thứ tự và lấy vùng khớp ĐẦU TIÊN, nên bảng `config/rails_timezones.php`
 * phải giữ nguyên thứ tự đó thì mốc thời gian mới trùng.
 */
final class TimezoneResolver
{
    /** ReportingEventHelper: so bằng độ lệch HIỆN TẠI nên vùng có giờ mùa hè vẫn khớp. */
    public static function fromOffset(mixed $offset): string
    {
        if (blank($offset)) {
            return 'UTC';
        }

        $offsetInSeconds = (int) round(((float) $offset) * 3600);
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));

        foreach (self::zones() as $identifier) {
            if ((new DateTimeZone($identifier))->getOffset($now) === $offsetInSeconds) {
                return $identifier;
            }
        }

        return 'UTC';
    }

    /** `ActiveSupport::TimeZone[7.0].to_s` → "(GMT+07:00) Bangkok" (so bằng độ lệch CHUẨN). */
    public static function label(mixed $offset): string
    {
        $offsetInSeconds = (int) round(((float) $offset) * 3600);

        foreach (self::zones() as $name => $identifier) {
            if (self::baseOffset($identifier) === $offsetInSeconds) {
                return '(GMT'.self::formatOffset($offsetInSeconds).') '.$name;
            }
        }

        return '';
    }

    /** @return array<string, string> tên ActiveSupport → định danh IANA */
    private static function zones(): array
    {
        return config('rails_timezones');
    }

    private static function baseOffset(string $identifier): int
    {
        $zone = new DateTimeZone($identifier);
        $now = time();
        $transitions = $zone->getTransitions($now, $now + 366 * 86400);

        foreach ($transitions as $transition) {
            if ($transition['isdst'] === false) {
                return $transition['offset'];
            }
        }

        return $zone->getOffset(new DateTimeImmutable('@'.$now));
    }

    private static function formatOffset(int $seconds): string
    {
        return sprintf('%s%02d:%02d', $seconds < 0 ? '-' : '+', intdiv(abs($seconds), 3600), intdiv(abs($seconds) % 3600, 60));
    }
}
