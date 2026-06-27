<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\LeadSourceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * LeadSource — workspace-scoped reference list for lead origin channel.
 * Mirrors Perfex tblleads_sources. Phase 07 adds Lead.source_id FK.
 */
class LeadSource extends Model
{
    /** @use HasFactory<LeadSourceFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
    ];

    protected function casts(): array
    {
        return [
            'lock_version' => 'integer',
        ];
    }
}
