<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\WorkingHourFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Validator;

/**
 * Một dòng cho mỗi thứ
 * trong tuần của một inbox.
 *
 * Validation của ActiveRecord chạy ở `save`; ở đây gom vào hook `saving` để mọi
 * đường ghi (API, seeder, job) đều đi qua cùng một bộ luật.
 */
class WorkingHour extends Model
{
    /** @use HasFactory<WorkingHourFactory> */
    use HasFactory;

    protected $fillable = [
        'inbox_id',
        'account_id',
        'day_of_week',
        'closed_all_day',
        'open_hour',
        'open_minutes',
        'close_hour',
        'close_minutes',
        'open_all_day',
    ];

    protected $attributes = [
        'closed_all_day' => false,
        'open_all_day' => false,
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'closed_all_day' => 'boolean',
            'open_all_day' => 'boolean',
            'open_hour' => 'integer',
            'open_minutes' => 'integer',
            'close_hour' => 'integer',
            'close_minutes' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (WorkingHour $workingHour) {
            $workingHour->ensureOpenAllDayHours();
            $workingHour->validateSchedule();
            $workingHour->account_id = $workingHour->inbox?->account_id;
        });
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function openNow(): bool
    {
        return $this->openAt($this->nowInInboxTimezone());
    }

    public function closedNow(): bool
    {
        return ! $this->openNow();
    }

    public function openAt(CarbonInterface $time): bool
    {
        if ($this->closed_all_day) {
            return false;
        }

        $today = $this->nowInInboxTimezone();
        $openTime = $today->copy()->setTime((int) $this->open_hour, (int) $this->open_minutes);
        $closeTime = $today->copy()->setTime((int) $this->close_hour, (int) $this->close_minutes);

        return $time->betweenIncluded($openTime, $closeTime);
    }

    private function nowInInboxTimezone(): CarbonInterface
    {
        return now()->setTimezone($this->inbox?->timezone ?: 'UTC');
    }

    // before_validation :ensure_open_all_day_hours — mở cả ngày ghi đè giờ mở/đóng.
    private function ensureOpenAllDayHours(): void
    {
        if (! $this->open_all_day) {
            return;
        }

        $this->open_hour = 0;
        $this->open_minutes = 0;
        $this->close_hour = 23;
        $this->close_minutes = 59;
    }

    private function validateSchedule(): void
    {
        $rules = [];

        if (! $this->closed_all_day) {
            $rules = [
                'open_hour' => ['required', 'integer', 'between:0,23'],
                'close_hour' => ['required', 'integer', 'between:0,23'],
                'open_minutes' => ['required', 'integer', 'between:0,59'],
                'close_minutes' => ['required', 'integer', 'between:0,59'],
            ];
        }

        Validator::make($this->only(array_keys($rules)), $rules)
            ->after(function ($validator) {
                if ($this->open_all_day && $this->closed_all_day) {
                    $validator->errors()->add('base', 'open_all_day and closed_all_day cannot be true at the same time');
                }

                if (! $this->closed_all_day && $validator->errors()->isEmpty() && $this->openMinuteOfDay() >= $this->closeMinuteOfDay()) {
                    $validator->errors()->add('close_hour', 'Closing time cannot be before opening time');
                }
            })
            ->validate();
    }

    private function openMinuteOfDay(): int
    {
        return (int) $this->open_hour * 60 + (int) $this->open_minutes;
    }

    private function closeMinuteOfDay(): int
    {
        return (int) $this->close_hour * 60 + (int) $this->close_minutes;
    }
}
