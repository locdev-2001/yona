<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Per-workspace human-readable counter (Deal #1234). Atomic increment lives in
 * the static next() helper (added in phase 05); this model is for reads.
 */
class WorkspaceSequence extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['next_value' => 'integer'];
    }
}
