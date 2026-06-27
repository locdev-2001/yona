<?php

namespace Modules\Billing\Enums;

/**
 * Entitlement catalog cho billing module — mirror cấu trúc TenantPermission.
 * flags[] = bật/tắt tính năng; quotas{} = giới hạn số lượng.
 *
 * Naming: module.* cho flag mở tính năng, quota.* cho giới hạn số,
 * integration.* cho bật kênh cụ thể.
 *
 * GĐ1 đủ dùng: Zalo personal + quota hội thoại + seat + inbox module.
 * GĐ2+: thêm integration.messenger, quota.conversations.messenger, v.v.
 */
enum TenantEntitlement: string
{
    // --- Module flags (bật/tắt toàn module) ---
    case ModuleInbox = 'module.inbox';
    case ModuleProjects = 'module.projects';

    // --- Integration flags (bật kênh cụ thể) ---
    case ZaloPersonal = 'integration.zalo_personal';

    // --- Quota conversations per-channel per-month ---
    case QuotaConversationsZaloPersonal = 'quota.conversations.zalo_personal';

    // --- Quota seats ---
    case QuotaSeats = 'quota.seats';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $e) => $e->value, self::cases());
    }
}
