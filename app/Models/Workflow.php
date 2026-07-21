<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\WorkflowFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Workflow — graph định nghĩa trigger→condition→action (1 rule đơn giản =
 * graph 3 node). WorkflowEngine chỉ đi-bộ graph, không hiểu nghĩa business
 * của node (docs/crm-automation-workflow.md).
 */
class Workflow extends Model
{
    /** @use HasFactory<WorkflowFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): WorkflowFactory
    {
        return WorkflowFactory::new();
    }

    protected $fillable = [
        'name',
        'graph',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'graph' => 'array',
            'is_active' => 'boolean',
            'lock_version' => 'integer',
        ];
    }

    /** @return HasMany<WorkflowRun, $this> */
    public function runs(): HasMany
    {
        return $this->hasMany(WorkflowRun::class);
    }
}
