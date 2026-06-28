<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Database\Factories\ActivityFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Append-only activity timeline entry (B4: merged from Perfex's 3 activity tables).
 *
 * IMMUTABLE — ghi CHỈ qua ActivityLogger::log() (service nội bộ).
 * HTTP layer KHÔNG có route create/update/delete cho activity.
 * The `updating`/`deleting` guards are a last-resort fence against code calling
 * save()/delete() directly; they will never be triggered from a normal HTTP request.
 *
 * No SoftDeletes, no HasOptimisticLock, no Auditable — this IS the log.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $subject_type
 * @property string $subject_id
 * @property int|null $actor_id
 * @property string|null $actor_contact_id
 * @property string|null $actor_name
 * @property string $action
 * @property array<string, mixed> $payload
 * @property bool $visible_to_customer
 * @property Carbon $occurred_at
 */
class Activity extends Model
{
    /** @use HasFactory<ActivityFactory> */
    use BelongsToWorkspace, HasFactory, HasUuids;

    // workspace_id, actor_id, actor_contact_id, actor_name, created_by are
    // server-controlled — not in $fillable.
    protected $fillable = [
        'subject_type',
        'subject_id',
        'action',
        'payload',
        'visible_to_customer',
        'occurred_at',
    ];

    /**
     * Enforce append-only invariant. These events fire ONLY from direct
     * Model::save()/delete() calls — never from HTTP (no routes for it).
     */
    protected static function booted(): void
    {
        static::updating(static function (): never {
            throw new RuntimeException('Activities are append-only and cannot be updated.');
        });

        static::deleting(static function (): never {
            throw new RuntimeException('Activities are append-only and cannot be deleted.');
        });
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'visible_to_customer' => 'boolean',
            'occurred_at' => 'datetime',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    protected static function newFactory(): ActivityFactory
    {
        return ActivityFactory::new();
    }
}
