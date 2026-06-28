<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\CustomFieldDefinitionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registry metadata for custom fields (P02, B3). No EAV — values live in
 * entity.custom_fields JSONB (key = slug). Slug + entity_type + field_type
 * are immutable after creation (enforced in CustomFieldService).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $entity_type one of ENTITY_TYPES
 * @property string $name
 * @property string $slug JSONB key on host entity
 * @property string $field_type one of FIELD_TYPES
 * @property array $options only for OPTION_TYPES
 * @property array|null $default_value
 * @property bool $required
 * @property bool $active
 * @property int $field_order
 * @property int $bs_column
 * @property bool $show_on_table
 * @property bool $show_on_client_portal
 * @property bool $disallow_client_edit
 * @property bool $only_admin
 * @property int $lock_version
 * @property int|null $created_by
 * @property int|null $updated_by
 *
 * @use HasFactory<CustomFieldDefinitionFactory>
 */
class CustomFieldDefinition extends Model
{
    /** @use HasFactory<CustomFieldDefinitionFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // G6 — single source of truth for entity type whitelist (P06-09 consume this).
    const ENTITY_TYPES = ['client', 'contact', 'lead', 'project', 'task'];

    // G6 — single source of truth for field type whitelist.
    const FIELD_TYPES = ['input', 'number', 'textarea', 'select', 'multiselect', 'checkbox', 'date', 'datetime', 'color', 'link'];

    // Types that require options (min:1 option).
    const OPTION_TYPES = ['select', 'multiselect', 'checkbox'];

    // Types whose value is an array (not scalar).
    const ARRAY_TYPES = ['multiselect', 'checkbox'];

    // User-editable fields only; workspace_id / entity_type / slug / created_by /
    // updated_by / lock_version are server-controlled (BR-X12).
    protected $fillable = [
        'name',
        'field_type',
        'options',
        'default_value',
        'required',
        'active',
        'field_order',
        'bs_column',
        'show_on_table',
        'show_on_client_portal',
        'disallow_client_edit',
        'only_admin',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'options' => 'array',
            'default_value' => 'array',
            'required' => 'boolean',
            'active' => 'boolean',
            'show_on_table' => 'boolean',
            'show_on_client_portal' => 'boolean',
            'disallow_client_edit' => 'boolean',
            'only_admin' => 'boolean',
            'field_order' => 'integer',
            'bs_column' => 'integer',
        ];
    }

    /** Whether this field type uses the options list. */
    public function usesOptions(): bool
    {
        return in_array($this->field_type, self::OPTION_TYPES, true);
    }

    /** @param Builder<static> $query */
    public function scopeForEntity(Builder $query, string $entityType): Builder
    {
        return $query->where('entity_type', $entityType);
    }

    /** @param Builder<static> $query */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /** @param Builder<static> $query */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('field_order')->orderBy('created_at');
    }

    protected static function newFactory(): CustomFieldDefinitionFactory
    {
        return CustomFieldDefinitionFactory::new();
    }
}
