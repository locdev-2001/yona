<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<TaskChecklistItem>
 */
class TaskChecklistItemFactory extends Factory
{
    protected $model = TaskChecklistItem::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory()->create()->id,
            'task_id' => Task::factory(),
            'description' => fake()->sentence(),
            'finished' => false,
            'finished_by' => null,
            'finished_at' => null,
            'assigned_user_id' => null,
            'item_order' => 0,
        ];
    }

    public function finished(): static
    {
        return $this->state([
            'finished' => true,
            'finished_at' => now(),
        ]);
    }
}
