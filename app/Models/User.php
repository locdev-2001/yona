<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * User — a global identity (one email system-wide, NOT workspace-scoped).
 * Joins N workspaces via WorkspaceMember; role/team/status live on membership.
 * `is_internal` flags platform staff. `id` stays bigint (hybrid ID strategy).
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * `status` / `is_internal` are server-controlled (BR-X12) — excluded.
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
            'is_internal' => 'boolean',
        ];
    }

    /** @return HasMany<WorkspaceMember, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(WorkspaceMember::class);
    }

    /** @return HasMany<PlatformRole, $this> */
    public function platformRoles(): HasMany
    {
        return $this->hasMany(PlatformRole::class);
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

    public function isInternal(): bool
    {
        return (bool) $this->is_internal;
    }
}
