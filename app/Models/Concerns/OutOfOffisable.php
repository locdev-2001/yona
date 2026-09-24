<?php

namespace App\Models\Concerns;

use App\Models\WorkingHour;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Validation\ValidationException;

/**
 * Lịch tuần của một inbox: 7 dòng `working_hours` sinh ngay khi inbox ra đời,
 * cùng bộ câu hỏi "giờ này còn mở cửa không".
 */
trait OutOfOffisable
{
    public const OFFISABLE_ATTRS = [
        'day_of_week',
        'closed_all_day',
        'open_hour',
        'open_minutes',
        'close_hour',
        'close_minutes',
        'open_all_day',
    ];

    /** @var list<array<string, mixed>> */
    public const DEFAULT_WORKING_HOURS = [
        ['day_of_week' => 0, 'closed_all_day' => true, 'open_all_day' => false],
        ['day_of_week' => 1, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
        ['day_of_week' => 2, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
        ['day_of_week' => 3, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
        ['day_of_week' => 4, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
        ['day_of_week' => 5, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
        ['day_of_week' => 6, 'closed_all_day' => true, 'open_all_day' => false],
    ];

    protected static function bootOutOfOffisable(): void
    {
        static::created(fn ($model) => $model->createDefaultWorkingHours());
    }

    /** @return HasMany<WorkingHour, $this> */
    public function workingHours(): HasMany
    {
        return $this->hasMany(WorkingHour::class);
    }

    public function outOfOffice(): bool
    {
        return $this->working_hours_enabled && (bool) $this->todayWorkingHour()?->closedNow();
    }

    public function workingNow(): bool
    {
        return ! $this->outOfOffice();
    }

    /**
     * `WorkingHour.today` của bản gốc: dòng ứng với thứ hôm nay TÍNH THEO múi giờ
     * của inbox, không phải múi giờ máy chủ.
     */
    public function todayWorkingHour(): ?WorkingHour
    {
        $workingHour = $this->workingHours()
            ->where('day_of_week', now()->setTimezone($this->timezone ?: 'UTC')->dayOfWeek)
            ->first();

        // Tránh nạp lại inbox từ DB cho mỗi phép so giờ.
        $workingHour?->setRelation('inbox', $this);

        return $workingHour;
    }

    /** @return list<array<string, mixed>> */
    public function weeklySchedule(): array
    {
        return $this->workingHours()
            ->orderBy('day_of_week')
            ->get()
            ->map(fn (WorkingHour $workingHour) => [
                'day_of_week' => $workingHour->day_of_week,
                'closed_all_day' => $workingHour->closed_all_day,
                'open_hour' => $workingHour->open_hour,
                'open_minutes' => $workingHour->open_minutes,
                'close_hour' => $workingHour->close_hour,
                'close_minutes' => $workingHour->close_minutes,
                'open_all_day' => $workingHour->open_all_day,
            ])
            ->all();
    }

    /**
     * Nhận mảng cùng hình dạng `weeklySchedule()`.
     *
     * Bản gốc dùng `update` (không phải `update!`): dòng không qua được validation
     * bị BỎ QUA trong im lặng, phần còn lại vẫn ghi. Giữ nguyên hành vi đó.
     *
     * @param  iterable<array<string, mixed>>  $schedule
     */
    public function updateWorkingHours(iterable $schedule): void
    {
        foreach ($schedule as $day) {
            $workingHour = $this->workingHours()->where('day_of_week', $day['day_of_week'] ?? null)->first();
            $workingHour?->setRelation('inbox', $this);

            try {
                $workingHour?->update(array_intersect_key($day, array_flip(self::OFFISABLE_ATTRS)));
            } catch (ValidationException) {
                continue;
            }
        }
    }

    public function createDefaultWorkingHours(): void
    {
        foreach (self::DEFAULT_WORKING_HOURS as $attributes) {
            $workingHour = $this->workingHours()->make($attributes);
            $workingHour->setRelation('inbox', $this);
            $workingHour->save();
        }
    }
}
