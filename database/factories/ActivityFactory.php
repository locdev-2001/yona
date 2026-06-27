<?php

namespace Database\Factories;

use App\Models\Activity;
use Modules\Identity\Models\Team;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

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
