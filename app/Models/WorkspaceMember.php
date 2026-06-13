<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\WorkspaceMemberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Membership — the workspace-scoped join carrying role + team + status.
 * Every field here is server-controlled (BR-X12): set via MembershipService,
 * never mass-assigned. $fillable is intentionally empty.
 */
class WorkspaceMember extends Model
{
    /** @use HasFactory<WorkspaceMemberFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids;

    /** Workspace roles (crm-authorization-model.md §Plane 2). */
    public const ROLES = ['admin', 'sales_manager', 'sales_rep', 'support_manager', 'support_agent', 'marketer', 'viewer'];

    protected $table = 'workspace_member';

    // BR-X12: fully server-controlled. Set via MembershipService / explicit
    // property assignment only — never mass-assigned from a request.
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'joined_at' => 'datetime',
            'lock_version' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
