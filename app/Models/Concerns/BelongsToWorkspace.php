<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Workspace;

/**
 * Layer 1 of the 3-layer tenant isolation (arch §4, BR-X01/X11/X14):
 *  - read side: a global scope filters every query by the active workspace.
 *  - write side: workspace_id is auto-stamped from the active workspace.
 *
 * Postgres RLS (layer 3) is the backstop even if this scope is bypassed; the
 * IdentifyWorkspace middleware (layer 2) establishes the active workspace.
 *
 * @phpstan-require-extends Model
 */
trait BelongsToWorkspace
{
    public static function bootBelongsToWorkspace(): void
    {
        static::addGlobalScope('workspace', function (Builder $query): void {
            if ($workspace = currentWorkspace()) {
                $query->where($query->getModel()->getTable().'.workspace_id', $workspace->id);
            }
        });

        static::creating(function (Model $model): void {
            if (empty($model->getAttribute('workspace_id')) && $workspace = currentWorkspace()) {
                $model->setAttribute('workspace_id', $workspace->id);
            }
        });
    }

    /** @return BelongsTo<Workspace, $this> */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
