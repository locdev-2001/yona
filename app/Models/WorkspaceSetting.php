<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\WorkspaceSettingFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * WorkspaceSetting — key-value JSONB defaults per workspace. No SoftDeletes:
 * rows are hard-upserted or deleted via SettingsService only. value is always
 * valid JSON (cast 'array'); never PHP-serialized (intentionally unlike Perfex
 * tbloptions). Read/write ONLY through SettingsService (single gateway).
 */
class WorkspaceSetting extends Model
{
    /** @use HasFactory<WorkspaceSettingFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids;

    // key is server-controlled (set via SettingsService); value is the only
    // user-supplied field and goes through SettingsService validation.
    protected $fillable = [
        'key',
        'value',
    ];

    protected function casts(): array
    {
        return [
            // JSONB column — Eloquent encodes/decodes JSON automatically.
            // Serialize contract: always JSON-valid, never serialize().
            'value' => 'array',
            'lock_version' => 'integer',
        ];
    }
}
