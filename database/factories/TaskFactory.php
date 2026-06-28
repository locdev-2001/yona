<?php

namespace Database\Factories;

use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $workspaceId = currentWorkspace()?->id ?? Workspace::factory()->create()->id;

        return [
            'workspace_id' => $workspaceId,
            // task_number via WorkspaceSequence — consistent with TaskService::create() (A3).
            // Factory generates its own sequence only for test isolation.
            'task_number' => WorkspaceSequence::next('task', $workspaceId),
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
            'status' => Task::STATUS_NOT_STARTED,
            'priority' => fake()->randomElement(Task::PRIORITIES),
            'start_date' => null,
            'due_date' => null,
            'billable' => false,
            'billed' => false,
            'visible_to_customer' => false,
            'kanban_order' => 0,
            'custom_fields' => [],
        ];
    }

    public function complete(): static
    {
        return $this->state(['status' => Task::STATUS_COMPLETE, 'finished_at' => now()]);
    }

    public function inProgress(): static
    {
        return $this->state(['status' => Task::STATUS_IN_PROGRESS]);
    }

    public function billed(): static
    {
        return $this->state(['billed' => true, 'billable' => true]);
    }
}
