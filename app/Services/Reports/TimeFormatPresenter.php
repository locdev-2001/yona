<?php

namespace App\Services\Reports;

// Đổi số giây thành chuỗi đọc được cho CSV; giữ tối đa hai đơn vị lớn nhất.
final class TimeFormatPresenter
{
    private readonly ?int $seconds;

    public function __construct(mixed $seconds = null)
    {
        $this->seconds = blank($seconds) ? null : (int) $seconds;
    }

    public function format(): string
    {
        if ($this->seconds === null || $this->seconds === 0) {
            return 'N/A';
        }

        $remainder = $this->seconds;
        $components = [];

        foreach (['days' => 86400, 'hours' => 3600, 'minutes' => 60] as $unit => $size) {
            $components[$unit] = intdiv($remainder, $size);
            $remainder %= $size;
        }

        $components['seconds'] = $remainder;

        $formatted = [];

        foreach ($components as $unit => $value) {
            if ($value !== 0) {
                $formatted[] = trans_choice("time_units.{$unit}", $value, ['count' => $value]);
            }
        }

        if ($formatted === []) {
            return trans_choice('time_units.seconds', 0, ['count' => 0]);
        }

        return implode(' ', array_slice($formatted, 0, 2));
    }
}
