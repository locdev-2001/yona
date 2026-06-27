<?php

namespace Database\Factories;

use Modules\CrmSales\Models\Pipeline;
use Illuminate\Database\Eloquent\Factories\Factory;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<Pipeline>
 */
class PipelineFactory extends Factory
{
    protected $model = Pipeline::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => fake()->unique()->words(2, true),
            'is_default' => false,
        ];
    }

    public function default(): static
    {
        return $this->state(['is_default' => true]);
    }
}
