<?php

namespace Modules\Tenancy\Models;

use Modules\Identity\Support\Audit\Audit;
use Database\Factories\WorkspaceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Workspace — one customer organization, the hard data-isolation boundary.
 * NOT workspace-scoped itself (no BelongsToWorkspace trait, no RLS policy).
 */
class Workspace extends Model
{
    /** @use HasFactory<WorkspaceFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    protected static function newFactory(): WorkspaceFactory
    {
        return WorkspaceFactory::new();
    }

    protected $fillable = [
        'name',
        'slug',
        'base_currency',
        'timezone',
        'locale',
        'default_pipeline_id',
        'audit_retention',
        'status',
    ];

    // Audit settings changes (BR-X05). Creation is a platform action without a
    // workspace context yet, so only update/delete are audited here.
    protected static function booted(): void
    {
        static::updated(fn (Workspace $workspace) => Audit::log($workspace, 'update'));
        static::deleted(fn (Workspace $workspace) => Audit::log($workspace, 'delete'));
    }

    /** @return HasMany<WorkspaceMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    /** @return HasMany<\Modules\Identity\Models\Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(\Modules\Identity\Models\Team::class);
    }

    /** @return BelongsTo<\Modules\Identity\Models\User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(\Modules\Identity\Models\User::class, 'created_by');
    }
}
