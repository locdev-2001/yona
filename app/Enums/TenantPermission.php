<?php

namespace App\Enums;

/**
 * Tenant-plane (web guard) permission catalog — source of truth in code.
 * Seeded into spatie's permissions table under guard `web`; assignments are
 * scoped per workspace. Symmetric with PlatformPermission (admin plane).
 */
enum TenantPermission: string
{
    case WorkspaceUpdate = 'tenant.workspace.update';
    case TeamManage = 'tenant.team.manage';
    case MemberManage = 'tenant.member.manage';
    case AuditView = 'tenant.audit.view';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
