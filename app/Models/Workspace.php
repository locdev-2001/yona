<?php

namespace App\Models;

use App\Support\Audit\Audit;
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

    /** @return HasMany<Team, $this> */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
