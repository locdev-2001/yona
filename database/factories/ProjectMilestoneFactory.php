<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<ProjectMilestone>
 */
class ProjectMilestoneFactory extends Factory
{
    protected $model = ProjectMilestone::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'project_id' => Project::factory(),
            'name' => fake()->words(fake()->numberBetween(2, 4), true),
            'color' => fake()->optional(0.7)->hexColor(),
            'due_date' => fake()->optional(0.6)->dateTimeBetween('now', '+3 months')?->format('Y-m-d'),
            'milestone_order' => 0,
            'description' => fake()->optional(0.4)->sentence(),
        ];
    }
}
