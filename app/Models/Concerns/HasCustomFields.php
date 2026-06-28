<?php

namespace App\Models\Concerns;

use App\Models\CustomFieldDefinition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Attaches custom-field capabilities to an entity host (P02, C1, G6).
 *
 * Contract for host entity:
 *  1. Implement abstract customFieldEntityType() returning one of CustomFieldDefinition::ENTITY_TYPES.
 *  2. Migration must add: $table->jsonb('custom_fields')->default('{}');
 *  3. Model must cast: 'custom_fields' => 'array'.
 *  4. Add a GIN index on custom_fields for query performance.
 *
 * Values live in `entity.custom_fields` JSONB (key = slug). The registry
 * (custom_field_definitions) holds only metadata.
 *
 * @phpstan-require-extends Model
 */
trait HasCustomFields
{
    /**
     * The entity type string this model represents.
     * Must return one of CustomFieldDefinition::ENTITY_TYPES.
     * G6 — host entity MUST implement this (enforced by abstract declaration).
     */
    abstract public function customFieldEntityType(): string;

    /**
     * Ordered active definitions for this entity's type within the active workspace.
     *
     * @return Collection<int, CustomFieldDefinition>
     */
    public function customFieldDefinitions(): Collection
    {
        return CustomFieldDefinition::forEntity($this->customFieldEntityType())
            ->active()
            ->ordered()
            ->get();
    }

    /**
     * Read a single custom-field value by its slug.
     * Returns null when the key is absent (null-safe for host entities
     * that have no custom_fields column yet or an empty bag).
     */
    public function getCustomField(string $slug): mixed
    {
        return data_get($this->custom_fields ?? [], $slug);
    }
}
