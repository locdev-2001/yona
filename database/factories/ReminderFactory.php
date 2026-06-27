<?php

namespace Database\Factories;

use App\Models\Reminder;
use App\Models\Team;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reminder>
 */
class ReminderFactory extends Factory
{
    protected $model = Reminder::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'remindable_type' => 'team',
            'remindable_id' => Team::factory(),
            'user_id' => User::factory(),
            'description' => fake()->sentence(),
            'remind_at' => now()->addHour(),
            'is_notified' => false,
        ];
    }

    /**
     * Reminder already past due (for scheduler tests).
     */
    public function due(): static
    {
        return $this->state(['remind_at' => now()->subMinute()]);
    }
}
