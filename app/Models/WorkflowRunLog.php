<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * WorkflowRunLog — append-only audit trail per step, 1 row mỗi lần
 * WorkflowEngine::advance() gọi 1 node handler. Cũng là nguồn dữ liệu
 * cho loop-cap detection (đếm số lần node_id lặp lại trong 1 run).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $workflow_run_id
 * @property string $node_id
 * @property string $node_type
 * @property string $result
 * @property string|null $message
 * @property Carbon $created_at
 */
class WorkflowRunLog extends Model
{
    use BelongsToWorkspace, HasUuids;

    public $timestamps = false;

    const RESULT_SUCCESS = 'success';

    const RESULT_FAILED = 'failed';

    const RESULT_SKIPPED = 'skipped';

    const RESULTS = [self::RESULT_SUCCESS, self::RESULT_FAILED, self::RESULT_SKIPPED];

    protected $fillable = [
        'workflow_run_id',
        'node_id',
        'node_type',
        'result',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $log): void {
            $log->created_at ??= now();
        });
    }

    /** @return BelongsTo<WorkflowRun, $this> */
    public function workflowRun(): BelongsTo
    {
        return $this->belongsTo(WorkflowRun::class);
    }
}
