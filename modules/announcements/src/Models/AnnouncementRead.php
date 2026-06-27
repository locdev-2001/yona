<?php

namespace Modules\Announcements\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Identity\Models\User;

/**
 * GLOBAL — no workspace_id, no RLS, no BelongsToWorkspace.
 * Read-state is shared across workspaces: once a user reads an announcement
 * in any workspace it is marked read everywhere (intentional UX decision).
 * Not Auditable — high-volume ephemeral records would flood audit_logs.
 */
class AnnouncementRead extends Model
{
    use HasUuids;

    // All fields are server-controlled (user_id always from auth()->id()).
    // Never mass-assigned from request body (BR-X12/IDOR prevention).
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Announcement, $this> */
    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
