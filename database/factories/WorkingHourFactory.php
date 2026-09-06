<?php

namespace Database\Factories;

use App\Models\Inbox;
use App\Models\WorkingHour;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Port từ spec/factories/working_hours.rb.
 *
 * @extends Factory<WorkingHour>
 */
class WorkingHourFactory extends Factory
{
    public function definition(): array
    {
        return [
            'inbox_id' => Inbox::factory(),
            'day_of_week' => 1,
            'open_hour' => 9,
            'open_minutes' => 0,
            'close_hour' => 17,
            'close_minutes' => 0,
        ];
    }
}
