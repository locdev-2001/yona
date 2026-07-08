<?php

namespace App\Enums;

/**
 * Platform-plane (admin guard) permission catalog — source of truth in code.
 * Seeded into spatie's permissions table under guard `admin`.
 */
enum PlatformPermission: string
{
    case WorkspacesView = 'platform.workspaces.view';
    case WorkspacesManage = 'platform.workspaces.manage';
    case BillingManage = 'platform.billing.manage';
    case AdminsManage = 'platform.admins.manage';
    case Impersonate = 'platform.impersonate';
    case AuditView = 'platform.audit.view';
    case MonitoringView = 'platform.monitoring.view';
    case AnnouncementsManage = 'platform.announcements.manage';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
