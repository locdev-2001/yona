<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use Database\Factories\TaskChecklistItemFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Checklist item for a task. item_order preserved for drag-reorder.
 * assigned_user_id validated as active WorkspaceMember in TaskService (G12).
 * finished_by / finished_at set atomically in TaskService::toggleChecklistItem().
 *
 * @use HasFactory<TaskChecklistItemFactory>
 */
class TaskChecklistItem extends Model
{
    /** @use HasFactory<TaskChecklistItemFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasUuids;

    protected static function newFactory(): TaskChecklistItemFactory
    {
        return TaskChecklistItemFactory::new();
    }

    protected $fillable = [
        'description',
    ];

    protected function casts(): array
    {
        return [
            'finished' => 'boolean',
            'finished_at' => 'datetime',
            'item_order' => 'integer',
        ];
    }

    // ─── Relations ────────────────────────────────────────────────────────────

    /** @return BelongsTo<Task, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function finishedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finished_by');
    }
}
