<?php

namespace App\Models;

use Database\Factories\ProjectMilestoneFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\BelongsToWorkspace;

/**
 * P08 — Milestone within a project. Ordered by milestone_order for kanban.
 * P09 will add: hasMany Task (via milestone_id).
 */
class ProjectMilestone extends Model
{
    /** @use HasFactory<ProjectMilestoneFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): ProjectMilestoneFactory
    {
        return ProjectMilestoneFactory::new();
    }

    protected $fillable = [
        'name',
        'color',
        'due_date',
        'description',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'milestone_order' => 'integer',
            'lock_version' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
