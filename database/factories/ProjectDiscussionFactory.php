<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectDiscussion;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<ProjectDiscussion>
 */
class ProjectDiscussionFactory extends Factory
{
    protected $model = ProjectDiscussion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'project_id' => Project::factory(),
            'subject' => fake()->sentence(fake()->numberBetween(3, 8)),
            'body' => fake()->optional(0.7)->paragraph(),
            'show_to_customer' => false,
            'author_id' => null,
        ];
    }

    public function showToCustomer(): static
    {
        return $this->state(['show_to_customer' => true]);
    }
}
