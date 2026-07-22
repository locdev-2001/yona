<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * WorkflowRun — 1 row = 1 lần enroll của 1 subject vào 1 Workflow.
 * Partial unique index (workflow_id, subject_type, subject_id) WHERE
 * status='running' chặn double-enroll (app/Models/../migrations
 * 2026_07_04_500002_create_workflow_runs_table.php).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $workflow_id
 * @property string $subject_type
 * @property string $subject_id
 * @property string|null $current_node_id
 * @property string $status
 * @property Carbon|null $resume_at
 * @property int $loop_count
 */
class WorkflowRun extends Model
{
    use BelongsToWorkspace, HasUuids;

    const STATUS_RUNNING = 'running';

    const STATUS_WAITING = 'waiting';

    const STATUS_COMPLETED = 'completed';

    const STATUS_FAILED = 'failed';

    const STATUSES = [self::STATUS_RUNNING, self::STATUS_WAITING, self::STATUS_COMPLETED, self::STATUS_FAILED];

    const SUBJECT_TYPES = ['lead', 'contact', 'conversation'];

    /** @var array<string, class-string<Model>> */
    const SUBJECT_MODELS = [
        'lead' => Lead::class,
        'contact' => Contact::class,
        'conversation' => Conversation::class,
    ];

    protected $fillable = [
        'workflow_id',
        'subject_type',
        'subject_id',
        'current_node_id',
        'status',
        'resume_at',
        'loop_count',
    ];

    protected function casts(): array
    {
        return [
            'resume_at' => 'datetime',
            'loop_count' => 'integer',
        ];
    }

    /** @return BelongsTo<Workflow, $this> */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    /** @return HasMany<WorkflowRunLog, $this> */
    public function logs(): HasMany
    {
        return $this->hasMany(WorkflowRunLog::class);
    }

    /**
     * Resolve the concrete subject model (Lead|Contact|Conversation) this
     * run was enrolled against. Null if the record was deleted since enroll.
     */
    public function subject(): ?Model
    {
        $modelClass = self::SUBJECT_MODELS[$this->subject_type] ?? null;

        if ($modelClass === null) {
            return null;
        }

        return $modelClass::find($this->subject_id);
    }
}
