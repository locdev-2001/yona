<?php

namespace Database\Factories;

use App\Models\ProjectStatus;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectStatus>
 */
class ProjectStatusFactory extends Factory
{
    protected $model = ProjectStatus::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => fake()->unique()->words(2, true),
            'color' => fake()->hexColor(),
            'status_order' => 0,
        ];
    }
}
