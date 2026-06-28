<?php

namespace App\Models;

use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use App\Models\Concerns\Auditable;
use App\Models\User;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\BelongsToWorkspace;

/**
 * Internal staff note (no portal visibility). date_contacted mirrors Perfex;
 * P07 reads it to update lead.last_contact. body may contain PII — referenced in audit.
 *
 * @property Carbon|null $date_contacted
 *
 * @use HasFactory<NoteFactory>
 */
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // user_id / workspace_id / created_by / updated_by are server-controlled.
    protected $fillable = [
        'body',
        'date_contacted',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'date_contacted' => 'date',
        ];
    }

    /** body may contain PII — audit stores reference. */
    public function auditPiiAttributes(): array
    {
        return ['body'];
    }

    /** @return MorphTo<Model, $this> */
    public function noteable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    protected static function newFactory(): NoteFactory
    {
        return NoteFactory::new();
    }
}
