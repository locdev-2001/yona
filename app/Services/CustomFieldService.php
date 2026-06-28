<?php

namespace App\Services;

use App\Models\CustomFieldDefinition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Custom-field engine (P02, C1). Public interface consumed by P06-09.
 *
 * Three concerns:
 *  1. Definition CRUD (slug auto, immutable fields, option-in-use guard).
 *  2. Value validation against the registry (validate).
 *  3. Value coercion + application to a host model (apply / defaults).
 *
 * G6 — entity_type guard is the first statement in every public method that
 * accepts an entityType param. apply() derives entityType from the model itself
 * (not a param) to prevent cross-entity pollution.
 */
class CustomFieldService
{
    // ─── Definition CRUD ──────────────────────────────────────────────────────

    /**
     * Create a new custom-field definition.
     * entity_type and slug are server-set (not from $attributes to prevent mass-assign).
     */
    public function createDefinition(string $entityType, array $attributes): CustomFieldDefinition
    {
        $this->guardEntityType($entityType);

        $definition = new CustomFieldDefinition;
        $definition->fill($attributes);
        $definition->entity_type = $entityType;
        $definition->slug = $this->slugFor($entityType, $attributes['name'] ?? '');
        $definition->created_by = auth()->id();

        // Validate options presence for option-bearing types
        if (in_array($definition->field_type, CustomFieldDefinition::OPTION_TYPES, true)) {
            $options = $definition->options ?? [];
            if (empty($options)) {
                throw new RuntimeException(__('custom_fields.errors.option_required'));
            }
        }

        // Coerce and validate default_value per field_type
        if (array_key_exists('default_value', $attributes)) {
            $definition->default_value = ($attributes['default_value'] !== null)
                ? $this->coerceDefaultValue(
                    $definition->field_type,
                    $attributes['default_value'],
                    $definition->options ?? []
                )
                : null;
        }

        $definition->save();

        return $definition;
    }

    /**
     * Update an existing definition.
     * entity_type and field_type are immutable — silently ignored if present in attrs.
     * Prevents removing options that are currently in use by host entities.
     */
    public function updateDefinition(CustomFieldDefinition $definition, array $attributes): CustomFieldDefinition
    {
        // Remove immutable fields — server enforces these locks (G6, spec step 8)
        unset($attributes['entity_type'], $attributes['field_type'], $attributes['slug']);

        // Option-in-use guard: check before applying new options
        if (isset($attributes['options']) && $definition->usesOptions()) {
            $this->guardOptionsInUse($definition, (array) $attributes['options']);
        }

        $definition->fill($attributes);
        $definition->updated_by = auth()->id();

        // Re-coerce default_value if provided
        if (array_key_exists('default_value', $attributes)) {
            $definition->default_value = ($attributes['default_value'] !== null)
                ? $this->coerceDefaultValue(
                    $definition->field_type,
                    $attributes['default_value'],
                    $definition->options ?? []
                )
                : null;
        }

        $definition->save();

        return $definition;
    }

    /**
     * Soft-delete a definition.
     */
    public function deleteDefinition(CustomFieldDefinition $definition): void
    {
        $definition->delete();
    }

    // ─── Value validation ──────────────────────────────────────────────────────

    /**
     * Validate a custom-fields payload against the registry for an entity type.
     * G6 — throws InvalidArgumentException if $entityType ∉ ENTITY_TYPES.
     *
     * @param  array<string, mixed>  $payload  map of slug => raw value
     * @return array<string, string> map of slug => error message (empty = valid)
     */
    public function validate(string $entityType, array $payload): array
    {
        $this->guardEntityType($entityType);

        $definitions = $this->loadDefinitions($entityType);
        $errors = [];

        foreach ($definitions as $definition) {
            $slug = $definition->slug;
            $value = $payload[$slug] ?? null;

            // Required check
            if ($definition->required && ($value === null || $value === '' || $value === [])) {
                $errors[$slug] = __('custom_fields.errors.required', ['name' => $definition->name]);

                continue;
            }

            // Skip further validation when value is absent and not required
            if ($value === null || $value === '') {
                continue;
            }

            $typeError = $this->validateByType($definition, $value);
            if ($typeError !== null) {
                $errors[$slug] = $typeError;
            }
        }

        return $errors;
    }

    /**
     * Coerce values and merge them into the model's custom_fields JSONB bag.
     * Only keys present in the registry are written; unknown keys in $payload
     * are silently dropped (mass-assign safety).
     * Does NOT call $model->save() — host service is responsible.
     *
     * G6 — asserts model's customFieldEntityType() ∈ ENTITY_TYPES; throws if not.
     * entityType is derived from the model to prevent cross-entity writes.
     *
     * @param  array<string, mixed>  $payload
     */
    public function apply(Model $model, array $payload): void
    {
        /** @phpstan-ignore-next-line */
        $entityType = $model->customFieldEntityType();

        if (! in_array($entityType, CustomFieldDefinition::ENTITY_TYPES, true)) {
            throw new InvalidArgumentException(
                "customFieldEntityType() returned an unknown entity type: '{$entityType}'. ".
                'Must be one of: '.implode(', ', CustomFieldDefinition::ENTITY_TYPES)
            );
        }

        $definitions = $this->loadDefinitions($entityType);
        $existing = $model->custom_fields ?? [];
        $clean = [];

        foreach ($definitions as $definition) {
            $slug = $definition->slug;

            if (! array_key_exists($slug, $payload)) {
                continue;
            }

            $clean[$slug] = $this->coerceValue($definition, $payload[$slug]);
        }

        /** @phpstan-ignore-next-line */
        $model->custom_fields = array_merge($existing, $clean);
    }

    /**
     * Build the default custom_fields bag for an entity type.
     * Only fields with a non-null default_value are included. Link fields are excluded.
     * G6 — throws if entityType ∉ ENTITY_TYPES.
     *
     * @return array<string, mixed>
     */
    public function defaults(string $entityType): array
    {
        $this->guardEntityType($entityType);

        $defaults = [];

        $this->loadDefinitions($entityType)
            ->filter(fn (CustomFieldDefinition $d) => $d->default_value !== null && $d->field_type !== 'link')
            ->each(function (CustomFieldDefinition $definition) use (&$defaults) {
                $coerced = $this->coerceDefaultValue(
                    $definition->field_type,
                    $definition->default_value,
                    $definition->options ?? []
                );

                if ($coerced !== null) {
                    $defaults[$definition->slug] = $coerced;
                }
            });

        return $defaults;
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Generate a unique slug for the given workspace context.
     * Pattern: snake_case(name), then _2, _3 … for collisions.
     */
    public function slugFor(string $entityType, string $name): string
    {
        $base = Str::snake(Str::ascii($name));
        $candidate = $base;
        $suffix = 2;

        while (
            CustomFieldDefinition::withoutGlobalScope('workspace')
                ->where('entity_type', $entityType)
                ->where('workspace_id', currentWorkspace()?->id)
                ->where('slug', $candidate)
                ->withTrashed()
                ->exists()
        ) {
            $candidate = $base.'_'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    /**
     * G6 — throw if entityType is not in the whitelist.
     */
    private function guardEntityType(string $entityType): void
    {
        if (! in_array($entityType, CustomFieldDefinition::ENTITY_TYPES, true)) {
            throw new InvalidArgumentException(
                "Unknown entity type: '{$entityType}'. Must be one of: ".implode(', ', CustomFieldDefinition::ENTITY_TYPES)
            );
        }
    }

    /**
     * Load active, ordered definitions for an entity type within the current workspace.
     *
     * @return Collection<int, CustomFieldDefinition>
     */
    private function loadDefinitions(string $entityType): Collection
    {
        return CustomFieldDefinition::forEntity($entityType)->active()->ordered()->get();
    }

    /**
     * Type-specific validation; returns an error message string or null if valid.
     */
    private function validateByType(CustomFieldDefinition $definition, mixed $value): ?string
    {
        return match ($definition->field_type) {
            'number' => is_numeric($value) ? null : __('custom_fields.errors.number_invalid', ['name' => $definition->name]),

            'select' => in_array($value, $definition->options ?? [], true)
                ? null
                : __('custom_fields.errors.option_in_list', ['name' => $definition->name]),

            'multiselect', 'checkbox' => $this->validateArrayOptions($definition, $value),

            'date' => $this->validateDateFormat($value, 'Y-m-d')
                ? null
                : __('custom_fields.errors.date_invalid', ['name' => $definition->name]),

            'datetime' => $this->validateDateFormat($value, 'Y-m-d H:i')
                ? null
                : __('custom_fields.errors.datetime_invalid', ['name' => $definition->name]),

            'color' => preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', (string) $value)
                ? null
                : __('custom_fields.errors.color_hex', ['name' => $definition->name]),

            'link' => $this->validateLinkShape($value)
                ? null
                : __('custom_fields.errors.link_url', ['name' => $definition->name]),

            default => null,  // input, textarea — any string accepted
        };
    }

    private function validateArrayOptions(CustomFieldDefinition $definition, mixed $value): ?string
    {
        if (! is_array($value)) {
            return __('custom_fields.errors.option_in_list', ['name' => $definition->name]);
        }

        $validOptions = $definition->options ?? [];
        $invalid = array_diff($value, $validOptions);

        return empty($invalid)
            ? null
            : __('custom_fields.errors.option_in_list', ['name' => $definition->name]);
    }

    private function validateDateFormat(mixed $value, string $format): bool
    {
        if (! is_string($value)) {
            return false;
        }

        $parsed = \DateTime::createFromFormat($format, $value);

        return $parsed !== false && $parsed->format($format) === $value;
    }

    private function validateLinkShape(mixed $value): bool
    {
        if (! is_array($value)) {
            return false;
        }

        $url = $value['url'] ?? null;

        return is_string($url) && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    /**
     * Coerce a raw value from a payload according to the definition's field_type.
     */
    private function coerceValue(CustomFieldDefinition $definition, mixed $value): mixed
    {
        return match ($definition->field_type) {
            'number' => is_numeric($value) ? $value + 0 : null,

            'multiselect', 'checkbox' => is_array($value)
                ? array_values(array_intersect($value, $definition->options ?? []))
                : [],

            'date' => is_string($value) && $this->validateDateFormat($value, 'Y-m-d')
                ? $value
                : null,

            'datetime' => is_string($value) && $this->validateDateFormat($value, 'Y-m-d H:i')
                ? $value
                : null,

            'color' => is_string($value) && preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value)
                ? strtoupper($value)
                : null,

            'link' => is_array($value) ? [
                'url' => (string) ($value['url'] ?? ''),
                'text' => (string) ($value['text'] ?? ''),
            ] : null,

            default => is_string($value) ? $value : (string) $value,
        };
    }

    /**
     * Coerce a default_value. link type is excluded (no meaningful default).
     * Returns null when coercion yields nothing usable.
     */
    private function coerceDefaultValue(string $fieldType, mixed $value, array $options): mixed
    {
        if ($fieldType === 'link') {
            return null;
        }

        // Reuse the same coercer by building a minimal stub definition object
        $stub = new CustomFieldDefinition;
        $stub->field_type = $fieldType;
        $stub->options = $options;

        return $this->coerceValue($stub, $value);
    }

    /**
     * Guard against removing options that are currently stored in host entity rows.
     * Minimal M1 implementation: scans the mapped host table via raw JSONB query.
     * Throws RuntimeException with i18n key if any option value is in active use.
     *
     * @param  array<int, string>  $newOptions
     */
    private function guardOptionsInUse(CustomFieldDefinition $definition, array $newOptions): void
    {
        $removedOptions = array_values(
            array_diff($definition->options ?? [], $newOptions)
        );

        if (empty($removedOptions)) {
            return;
        }

        // Map entity_type → host table (populated as entities are built in P06-09)
        $hostTables = [
            'client' => 'clients',
            'contact' => 'contacts',
            'lead' => 'leads',
            'project' => 'projects',
            'task' => 'tasks',
        ];

        $hostTable = $hostTables[$definition->entity_type] ?? null;

        if ($hostTable === null) {
            return; // table not yet created (pre-P06 phase); skip check
        }

        // Check whether the host table exists before querying
        if (! Schema::hasTable($hostTable)) {
            return;
        }

        $slug = $definition->slug;

        foreach ($removedOptions as $option) {
            // JSONB contains check: scalar value in array (array_types) or direct value
            $usedInArray = DB::table($hostTable)
                ->where('workspace_id', $definition->workspace_id)
                ->whereRaw('custom_fields->? @> ?::jsonb', [$slug, json_encode([$option])])
                ->limit(1)
                ->exists();

            $usedAsScalar = DB::table($hostTable)
                ->where('workspace_id', $definition->workspace_id)
                ->whereRaw('custom_fields->>? = ?', [$slug, $option])
                ->limit(1)
                ->exists();

            if ($usedInArray || $usedAsScalar) {
                throw new RuntimeException(
                    __('custom_fields.errors.option_in_use', ['option' => $option])
                );
            }
        }
    }
}
