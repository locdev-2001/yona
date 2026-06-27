<?php

namespace Modules\Identity\Models;

use Database\Factories\AdminFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

/**
 * Admin — platform-plane identity (guard `admin`). Manages the platform
 * (workspaces, billing, other admins) and never holds a workspace membership.
 * Platform RBAC lives in the admin_* tables, separate from the workspace-scoped
 * spatie tables. `status` is server-controlled (BR-X12).
 */
class Admin extends Authenticatable
{
    /** @use HasFactory<AdminFactory> */
    use HasFactory, HasRoles, Notifiable;

    protected static function newFactory(): AdminFactory
    {
        return AdminFactory::new();
    }

    /**
     * Reserved spatie team scope for platform-plane role assignments — admins
     * have no workspace, so their assignments share this fixed id (keeps the
     * workspace-scoped pivot + RLS untouched). The admin guard binds it.
     */
    public const PLATFORM_SCOPE = '00000000-0000-0000-0000-000000000000';

    public const STATUSES = ['active', 'locked'];

    /** Admins authenticate and carry roles on the `admin` guard. */
    protected $guard_name = 'admin';

    /**
     * `status` is server-controlled (BR-X12) — excluded from mass assignment.
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

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
