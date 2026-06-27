<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasActivities;
use App\Models\Concerns\HasAttachments;
use App\Models\Concerns\HasComments;
use App\Models\Concerns\HasCustomFields;
use App\Models\Concerns\HasNotes;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\HasReminders;
use App\Models\Concerns\HasTags;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Task — entity giàu nhất M1: polymorphic related-to, multi-assignee, checklist, timer/timesheet.
 * Status/priority = const enum (D4, Perfex cố định) — KHÔNG bảng lookup.
 * related_type lưu morph alias (G3): lead|client|project|contact.
 * custom_fields JSONB (P02, B3); implement customFieldEntityType() = 'task' (G6, bắt buộc).
 *
 * @use HasFactory<TaskFactory>
 */
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use Auditable, BelongsToWorkspace, HasActivities, HasAttachments, HasComments, HasCustomFields, HasFactory, HasNotes, HasOptimisticLock, HasReminders, HasTags, HasUuids, SoftDeletes;

    // ─── Status constants (Perfex IDs, giữ đúng số gốc) ─────────────────────
    const STATUS_NOT_STARTED = 1;

    const STATUS_AWAITING_FEEDBACK = 2;

    const STATUS_TESTING = 3;

    const STATUS_IN_PROGRESS = 4;

    const STATUS_COMPLETE = 5;

    const STATUSES = [1, 2, 3, 4, 5];

    // ─── Priority constants ───────────────────────────────────────────────────
    const PRIORITY_LOW = 1;

    const PRIORITY_MEDIUM = 2;

    const PRIORITY_HIGH = 3;

    const PRIORITY_URGENT = 4;

    const PRIORITIES = [1, 2, 3, 4];

    // ─── Polymorphic related-to type aliases (G3) ─────────────────────────────
    const RELATED_TYPES = ['lead', 'client', 'project', 'contact'];

    // status, finished_at, related_*, kanban_order, billed, task_number,
    // workspace_id, owner_id, team_id, created_by, updated_by, lock_version — server-controlled
    protected $fillable = [
        'name',
        'description',
        'priority',
        'start_date',
        'due_date',
        'billable',
        'hourly_rate',
        'visible_to_customer',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'finished_at' => 'datetime',
            'billable' => 'boolean',
            'billed' => 'boolean',
            'visible_to_customer' => 'boolean',
            'status' => 'integer',
            'priority' => 'integer',
            'custom_fields' => 'array',
            'hourly_rate' => 'decimal:2',
            'kanban_order' => 'integer',
            'task_number' => 'integer',
            'lock_version' => 'integer',
        ];
    }

    // ─── G6 — required abstract implementation ────────────────────────────────
    public function customFieldEntityType(): string
    {
        return 'task';
    }

    public function activitySubjectName(): string
    {
        return 'Task #'.$this->task_number.' '.$this->name;
    }

    // ─── Relations ────────────────────────────────────────────────────────────

    /** @return BelongsTo<ProjectMilestone, $this> */
    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    /**
     * Multi-assignee pivot. assigned_by = user who assigned.
     *
     * @return BelongsToMany<User, $this, TaskAssignee>
     */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees', 'task_id', 'user_id')
            ->using(TaskAssignee::class)
            ->withPivot('assigned_by', 'workspace_id')
            ->withTimestamps();
    }

    /**
     * Followers pivot (should — table created, UI optional).
     *
     * @return BelongsToMany<User, $this, TaskFollower>
     */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_followers', 'task_id', 'user_id')
            ->using(TaskFollower::class)
            ->withPivot('workspace_id')
            ->withTimestamps();
    }

    /**
     * Ordered checklist items.
     *
     * @return HasMany<TaskChecklistItem, $this>
     */
    public function checklistItems(): HasMany
    {
        return $this->hasMany(TaskChecklistItem::class)->orderBy('item_order');
    }

    /** @return HasMany<TaskTimer, $this> */
    public function timers(): HasMany
    {
        return $this->hasMany(TaskTimer::class);
    }

    /** @return HasMany<TaskTimer, $this> */
    public function runningTimers(): HasMany
    {
        return $this->hasMany(TaskTimer::class)->whereNull('end_time');
    }

    /**
     * Polymorphic related-to (lead|client|project|contact).
     * Morph alias stored in related_type (G3 enforce map); related_id = uuid.
     */
    public function related(): MorphTo
    {
        return $this->morphTo('related', 'related_type', 'related_id');
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isComplete(): bool
    {
        return $this->status === self::STATUS_COMPLETE;
    }

    public function isBilled(): bool
    {
        return (bool) $this->billed;
    }

    public function isAssignee(User $user): bool
    {
        return $this->assignees->contains($user);
    }
}
