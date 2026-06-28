<?php

namespace Database\Factories;

use Modules\CrmSales\Models\Lead;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<Lead>
 *
 * IMPORTANT: lead_number is NOT set here — LeadService sets it via WorkspaceSequence::next().
 * In tests that bypass the service (raw factory insert), use the ->numbered() state or set
 * lead_number manually after factory create() to avoid unique constraint violations.
 *
 * Pipeline + stage are linked: stage must belong to the same pipeline. The factory
 * creates a pipeline and attaches a stage from that pipeline to satisfy G8.
 */
class LeadFactory extends Factory
{
    protected $model = Lead::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Build a pipeline so the stage can reference the same workspace
        $pipeline = Pipeline::factory()->create();

        $stage = PipelineStage::factory()->for($pipeline)->create([
            'workspace_id' => $pipeline->workspace_id,
        ]);

        return [
            'workspace_id' => $pipeline->workspace_id,
            'owner_id' => null,
            'team_id' => null,
            // lead_number is set by LeadService via WorkspaceSequence — not factory
            'lead_number' => 0,
            'name' => fake()->name(),
            'title' => fake()->optional(0.5)->jobTitle(),
            'email' => fake()->optional(0.8)->safeEmail(),
            'phone' => fake()->optional(0.6)->phoneNumber(),
            'company' => fake()->optional(0.7)->company(),
            'lead_value' => fake()->optional(0.6)->randomFloat(2, 100, 100000),
            'address' => fake()->optional(0.4)->streetAddress(),
            'city' => fake()->optional(0.4)->city(),
            'state' => null,
            'zip' => null,
            'country' => null,
            'website' => null,
            'description' => null,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $stage->id,
            'source_id' => null,
            'assigned_to' => null,
            'last_contact' => null,
            'date_converted' => null,
            'converted_client_id' => null,
            'is_junk' => false,
            'is_lost' => false,
            'is_public' => false,
            'lead_order' => 0,
            'last_stage_id' => null,
            'custom_fields' => [],
        ];
    }

    /**
     * State: assign a specific lead_number for tests that insert without the service.
     */
    public function numbered(int $number = 1): static
    {
        return $this->state(['lead_number' => $number]);
    }

    /**
     * State: lead belonging to specific pipeline + stage (stage must belong to pipeline).
     */
    public function inPipeline(Pipeline $pipeline, PipelineStage $stage): static
    {
        return $this->state([
            'workspace_id' => $pipeline->workspace_id,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $stage->id,
        ]);
    }

    /**
     * State: mark as is_public.
     */
    public function public(): static
    {
        return $this->state(['is_public' => true]);
    }
}
