<?php

namespace App\Models;

use Database\Factories\PipelineFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Shared\Concerns\HasOptimisticLock;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * Pipeline — a workspace-scoped lead funnel. Each pipeline owns ordered stages.
 * At most one pipeline per workspace may have is_default=true (single-default
 * invariant enforced by LookupService, not DB constraint).
 */
class Pipeline extends Model
{
    /** @use HasFactory<PipelineFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // User-supplied fields only. workspace_id / created_by / updated_by /
    // lock_version / is_default (managed via service) are server-controlled.
    protected $fillable = [
        'name',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'bool',
            'lock_version' => 'integer',
        ];
    }

    /** @return HasMany<PipelineStage, $this> */
    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->orderBy('stage_order');
    }
}
