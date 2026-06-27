<?php

namespace Modules\Tenancy\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use RuntimeException;

/**
 * Per-workspace human-readable counter (Deal #1234, Ticket #5678 — arch §9c).
 * next() is race-safe: a single INSERT … ON CONFLICT DO UPDATE … RETURNING does
 * the read-modify-write atomically under a row lock.
 */
class WorkspaceSequence extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['next_value' => 'integer'];
    }

    /**
     * Atomically reserve and return the next value for an entity in the
     * active workspace (1, 2, 3, …).
     */
    public static function next(string $entity, ?string $workspaceId = null): int
    {
        $workspaceId ??= currentWorkspace()?->id;

        if (! $workspaceId) {
            throw new RuntimeException('Cannot reserve a sequence value without a workspace context.');
        }

        $row = DB::selectOne(
            'insert into workspace_sequences (id, workspace_id, entity, next_value, created_at, updated_at) '.
            'values (?, ?, ?, 1, now(), now()) '.
            'on conflict (workspace_id, entity) '.
            'do update set next_value = workspace_sequences.next_value + 1, updated_at = now() '.
            'returning next_value',
            [(string) Str::orderedUuid(), $workspaceId, $entity],
        );

        return (int) $row->next_value;
    }
}
