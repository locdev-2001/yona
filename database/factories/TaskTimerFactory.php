<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskTimer;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;
use App\Models\Workspace;

/**
 * @extends Factory<TaskTimer>
 */
class TaskTimerFactory extends Factory
{
    protected $model = TaskTimer::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-7 days', '-1 hour');
        $end = fake()->dateTimeBetween($start, 'now');

        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory()->create()->id,
            'task_id' => Task::factory(),
            'user_id' => User::factory(),
            'start_time' => $start,
            'end_time' => $end,
            'hourly_rate' => null,
            'note' => null,
        ];
    }

    /** Timer chạy (end_time = null). */
    public function running(): static
    {
        return $this->state(['end_time' => null]);
    }
}
