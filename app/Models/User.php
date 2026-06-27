<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Spatie\Permission\Traits\HasRoles;

/**
 * User — a global identity (one email system-wide, NOT workspace-scoped).
 * Joins N workspaces via WorkspaceMember; role/team/status live on membership.
 * Platform staff access is managed via the Admin model (guard `admin`).
 * `id` stays bigint (hybrid ID strategy).
 *
 * spatie roles are scoped per workspace via team_foreign_key=workspace_id;
 * call setPermissionsTeamId($workspace->id) (done by IdentifyWorkspace) before
 * role/permission checks so they resolve within the active workspace.
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * `status` is server-controlled (BR-X12) — excluded.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'locale',
        'timezone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<WorkspaceMember, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    /**
     * Active membership for a given workspace (or null).
     */
    public function membershipFor(Workspace|string $workspace): ?WorkspaceMember
    {
        $workspaceId = $workspace instanceof Workspace ? $workspace->id : $workspace;

        return $this->memberships()
            ->where('workspace_id', $workspaceId)
            ->where('status', 'active')
            ->first();
    }
}
