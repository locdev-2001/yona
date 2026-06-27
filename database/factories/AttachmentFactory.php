<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Modules\Identity\Models\Team;
use Modules\Shared\Models\Attachment;
use Modules\Tenancy\Models\Workspace;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            // Default attachable: Team (standalone test double; P06-09 override per entity).
            'attachable_type' => 'team',
            'attachable_id' => Team::factory(),
            'user_id' => null,
            'contact_id' => null,
            'original_name' => fake()->word().'.pdf',
            'path' => 'attachments/test/'.Str::uuid().'.pdf',
            'external_link' => null,
            'thumbnail_path' => null,
            'mime' => 'application/pdf',
            'size' => fake()->numberBetween(1024, 1024 * 1024),
            'visible_to_customer' => false,
            'attachment_key' => Str::random(40),
        ];
    }

    /** Override to use a specific parent model as the attachable. */
    public function for_attachable(string $morphAlias, string $modelId): static
    {
        return $this->state(fn () => [
            'attachable_type' => $morphAlias,
            'attachable_id' => $modelId,
        ]);
    }

    public function visibleToCustomer(): static
    {
        return $this->state(fn () => ['visible_to_customer' => true]);
    }

    public function external(string $url): static
    {
        return $this->state(fn () => [
            'path' => null,
            'external_link' => $url,
            'mime' => null,
            'size' => null,
        ]);
    }
}
