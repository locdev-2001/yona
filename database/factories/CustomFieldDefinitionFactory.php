<?php

namespace Database\Factories;

use App\Models\CustomFieldDefinition;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CustomFieldDefinition>
 */
class CustomFieldDefinitionFactory extends Factory
{
    protected $model = CustomFieldDefinition::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            // Respect an active workspace context (RLS WITH CHECK on insert);
            // otherwise spin up a fresh workspace for standalone use.
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'entity_type' => fake()->randomElement(CustomFieldDefinition::ENTITY_TYPES),
            'name' => $name,
            'slug' => Str::snake($name),  // service resolves collision; factory keeps it simple
            'field_type' => 'input',
            'options' => [],
            'default_value' => null,
            'required' => false,
            'active' => true,
            'field_order' => fake()->numberBetween(0, 100),
            'bs_column' => 12,
            'show_on_table' => false,
            'show_on_client_portal' => false,
            'disallow_client_edit' => false,
            'only_admin' => false,
        ];
    }

    /** A select-type field with two default options. */
    public function select(): static
    {
        return $this->state(fn () => [
            'field_type' => 'select',
            'options' => ['Option A', 'Option B'],
        ]);
    }

    /** A multiselect-type field with two default options. */
    public function multiselect(): static
    {
        return $this->state(fn () => [
            'field_type' => 'multiselect',
            'options' => ['Option A', 'Option B'],
        ]);
    }

    /** Mark the field as required. */
    public function required(): static
    {
        return $this->state(fn () => ['required' => true]);
    }

    /** Scope to a specific entity_type. */
    public function forEntity(string $entityType): static
    {
        return $this->state(fn () => ['entity_type' => $entityType]);
    }
}
