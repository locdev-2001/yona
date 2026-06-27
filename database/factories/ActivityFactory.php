<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Identity\Models\Team;
use Modules\Shared\Models\Activity;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Default subject: Team (always available in M0 tests). Override in tests:
        //   ActivityFactory::new()->for(Team::factory(), 'subject')
        // workspace_id stamped by BelongsToWorkspace::creating (RLS-safe).
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'subject_type' => 'team',
            'subject_id' => Team::factory(),
            'actor_id' => null,
            'actor_name' => fake()->name(),
            'action' => 'team.created',
            'payload' => [],
            'visible_to_customer' => false,
            'occurred_at' => now(),
        ];
    }
}
