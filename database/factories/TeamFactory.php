<?php

namespace Database\Factories;

use App\Models\Team;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

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
