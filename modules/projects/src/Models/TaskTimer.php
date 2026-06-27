<?php

namespace Modules\Projects\Models;

use Database\Factories\TaskTimerFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Identity\Models\User;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * Task timer (timesheet entry). Running = end_time IS NULL.
 * hourly_rate is snapshotted at start — NOT updated retroactively.
 * No SoftDeletes: timesheet entries are immutable; delete only via TaskTimerService with guards.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $task_id
 * @property int $user_id
 * @property Carbon $start_time
 * @property Carbon|null $end_time null = running
 * @property string|null $hourly_rate
 * @property string|null $note
 *
 * @use HasFactory<TaskTimerFactory>
 */
class TaskTimer extends Model
{
    /** @use HasFactory<TaskTimerFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasUuids;

    protected static function newFactory(): TaskTimerFactory
    {
        return TaskTimerFactory::new();
    }

    // start_time, end_time, user_id, task_id, workspace_id set by TaskTimerService only
    protected $fillable = [
        'note',
        'hourly_rate',
    ];

    /** Serialize the computed duration so the frontend timesheet renders it instead of NaN. */
    protected $appends = ['duration_seconds'];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'hourly_rate' => 'decimal:2',
        ];
    }

    // ─── Relations ────────────────────────────────────────────────────────────

    /** @return BelongsTo<Task, $this> */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    /** @param Builder<TaskTimer> $query */
    public function scopeRunning(Builder $query): void
    {
        $query->whereNull('end_time');
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /** Duration in seconds. Uses now() for running timers. */
    public function getDurationSecondsAttribute(): int
    {
        $end = $this->end_time ?? now();

        return (int) $this->start_time->diffInSeconds($end);
    }

    public function isRunning(): bool
    {
        return $this->end_time === null;
    }
}
