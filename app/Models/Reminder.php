<?php

namespace App\Models;

use Modules\Identity\Models\Concerns\Auditable;
use Modules\Identity\Models\User;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\ReminderFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A reminder attached to any workspace entity (polymorphic remindable).
 * Full trait stack (A1). Scheduler reads is_notified=false, fires notification,
 * sets is_notified=true + notified_at.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $remindable_type
 * @property string $remindable_id
 * @property int $user_id
 * @property string $description
 * @property Carbon $remind_at
 * @property bool $is_notified
 * @property Carbon|null $notified_at
 */
class Reminder extends Model
{
    /** @use HasFactory<ReminderFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // is_notified, notified_at, workspace_id, created_by, updated_by, lock_version
    // are server-controlled (BR-X12).
    protected $fillable = [
        'remindable_type',
        'remindable_id',
        'user_id',
        'description',
        'remind_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'notified_at' => 'datetime',
            'is_notified' => 'boolean',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function remindable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
