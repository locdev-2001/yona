<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit entry (BR-X05). Immutable: no update/delete path — those
 * throw. Reads pass the workspace global scope (added in phase 03); writes are
 * performed by the Audit writer on the privileged connection (phase 05).
 */
class AuditLog extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    public const CREATED_AT = null;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'context' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * Immutability guard (BR-X05): an audit row may be inserted but never
     * updated or deleted through the application.
     */
    protected static function booted(): void
    {
        static::updating(fn () => throw new \RuntimeException('Audit logs are append-only and cannot be updated.'));
        static::deleting(fn () => throw new \RuntimeException('Audit logs are append-only and cannot be deleted.'));
    }
}
