<?php

namespace Modules\CrmSales\Models;

use Database\Factories\PipelineStageFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Shared\Concerns\HasOptimisticLock;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * PipelineStage — one step inside a Pipeline. type ∈ STAGE_TYPES (string,
 * no DB enum). Cross-pipeline invariant (G8): a Lead's stage_id must belong to
 * its pipeline_id — enforced by LeadService + FormRequest in Phase 07.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $pipeline_id
 * @property string $name
 * @property string|null $color
 * @property int $stage_order
 * @property int $probability
 * @property string $type
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property int $lock_version
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 */
class PipelineStage extends Model
{
    /** @use HasFactory<PipelineStageFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): PipelineStageFactory
    {
        return PipelineStageFactory::new();
    }

    /** Valid stage types (no DB enum — stored as plain string). */
    public const STAGE_TYPES = ['open', 'won', 'lost'];

    // workspace_id / pipeline_id / created_by / updated_by / lock_version are
    // server-controlled; never accepted from user input.
    protected $fillable = [
        'name',
        'color',
        'stage_order',
        'probability',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'stage_order' => 'integer',
            'probability' => 'integer',
            'lock_version' => 'integer',
        ];
    }

    /** @return BelongsTo<Pipeline, $this> */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }
}
