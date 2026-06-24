<?php

namespace App\Enums;

/**
 * Audience targeting type for announcements.
 * v1 only implements All; Plan/Entitlement/WorkspaceFilter are
 * placeholder cases reserved for future targeting expansions.
 */
enum AnnouncementAudience: string
{
    case All = 'all';
    case Plan = 'plan';               // placeholder — not implemented in v1
    case Entitlement = 'entitlement'; // placeholder — not implemented in v1
    case WorkspaceFilter = 'workspace_filter'; // placeholder — not implemented in v1

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
