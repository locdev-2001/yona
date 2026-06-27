<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Project;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 *
 * NOTE: project_number is set to a fake integer here. In production, always
 * create projects via ProjectService::create() which calls WorkspaceSequence::next().
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'project_number' => fake()->unique()->numberBetween(1, 99999),
            'name' => fake()->words(fake()->numberBetween(2, 5), true),
            'description' => fake()->optional(0.6)->paragraph(),
            'client_id' => Client::factory(),
            'status_id' => null,
            'owner_id' => null,
            'team_id' => null,
            'billing_type' => fake()->randomElement([Project::BILLING_FIXED, Project::BILLING_HOURLY, Project::BILLING_NON_BILLABLE]),
            'start_date' => fake()->optional(0.7)->dateTimeBetween('-3 months', 'now')?->format('Y-m-d'),
            'deadline' => fake()->optional(0.6)->dateTimeBetween('now', '+6 months')?->format('Y-m-d'),
            'finished_at' => null,
            'progress' => fake()->numberBetween(0, 100),
            'progress_from_tasks' => false,
            'is_pinned' => false,
            'visible_to_customer' => false,
            'custom_fields' => [],
        ];
    }

    public function pinned(): static
    {
        return $this->state(['is_pinned' => true]);
    }

    public function visibleToCustomer(): static
    {
        return $this->state(['visible_to_customer' => true]);
    }
}
