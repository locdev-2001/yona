<?php

namespace Database\Factories;

use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<PipelineStage>
 */
class PipelineStageFactory extends Factory
{
    protected $model = PipelineStage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'pipeline_id' => Pipeline::factory(),
            'name' => fake()->unique()->words(2, true),
            'color' => fake()->hexColor(),
            'stage_order' => 0,
            'probability' => 0,
            'type' => 'open',
        ];
    }

    public function won(): static
    {
        return $this->state(['type' => 'won', 'probability' => 100]);
    }

    public function lost(): static
    {
        return $this->state(['type' => 'lost', 'probability' => 0]);
    }
}
