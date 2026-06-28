<?php

namespace App\Models;

use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasActivities;
use App\Models\Concerns\HasAttachments;
use App\Models\Concerns\HasComments;
use App\Models\Concerns\HasNotes;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\HasReminders;
use App\Models\Concerns\HasTags;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\WorkspaceMember;

/**
 * Team — a node in the per-workspace team tree (BR-X02). Structural changes
 * (parent_id, closure) go through TeamService for cycle-guard + closure upkeep.
 */
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use Auditable, BelongsToWorkspace, HasActivities, HasAttachments, HasComments, HasFactory, HasNotes, HasOptimisticLock, HasReminders, HasTags, HasUuids, SoftDeletes;

    protected static function newFactory(): TeamFactory
    {
        return TeamFactory::new();
    }

    // workspace_id / parent_id are server-controlled (BR-X12) — set via service.
    protected $fillable = [
        'name',
    ];

    /** @return BelongsTo<Team, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'parent_id');
    }

    /** @return HasMany<Team, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(Team::class, 'parent_id');
    }

    /** @return HasMany<WorkspaceMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }
}
