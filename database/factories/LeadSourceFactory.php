<?php

namespace Database\Factories;

use Modules\CrmSales\Models\LeadSource;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<LeadSource>
 */
class LeadSourceFactory extends Factory
{
    protected $model = LeadSource::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => fake()->unique()->word(),
        ];
    }
}
