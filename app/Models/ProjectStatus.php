<?php

namespace App\Models;

use Database\Factories\ProjectStatusFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\BelongsToWorkspace;

/**
 * ProjectStatus — configurable workspace-scoped lookup (G11). Phase 08
 * (Projects) adds project.status_id FK and consumes this table.
 */
class ProjectStatus extends Model
{
    /** @use HasFactory<ProjectStatusFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): ProjectStatusFactory
    {
        return ProjectStatusFactory::new();
    }

    protected $fillable = [
        'name',
        'color',
        'status_order',
    ];

    protected function casts(): array
    {
        return [
            'status_order' => 'integer',
            'lock_version' => 'integer',
        ];
    }
}
