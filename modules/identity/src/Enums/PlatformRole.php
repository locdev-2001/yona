<?php

namespace Modules\Identity\Enums;

/**
 * Platform-plane (admin guard) role catalog — source of truth in code.
 * Seeded into spatie's roles table under guard `admin`; each role's granted
 * permissions are defined by permissions().
 */
enum PlatformRole: string
{
    case SuperAdmin = 'super_admin';
    case SupportEngineer = 'support_engineer';
    case BillingOps = 'billing_ops';

    /** @return list<string> Permissions granted to this role. */
    public function permissions(): array
    {
        return match ($this) {
            self::SuperAdmin => PlatformPermission::values(),
            self::SupportEngineer => [
                PlatformPermission::WorkspacesView->value,
                PlatformPermission::Impersonate->value,
                PlatformPermission::AuditView->value,
            ],
            self::BillingOps => [
                PlatformPermission::WorkspacesView->value,
                PlatformPermission::BillingManage->value,
            ],
        };
    }
}
