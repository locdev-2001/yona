<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Identity\Models\Team;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    protected $model = Team::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Respect an active workspace context (RLS WITH CHECK on insert);
            // otherwise spin up a fresh workspace for standalone use.
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => fake()->unique()->words(2, true),
            'parent_id' => null,
        ];
    }
}
