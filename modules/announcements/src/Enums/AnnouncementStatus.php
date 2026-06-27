<?php

namespace Modules\Announcements\Enums;

/**
 * Announcement publication status.
 * Source of truth; mirrored to TypeScript in Phase 3.
 */
enum AnnouncementStatus: string
{
    case Draft = 'draft';
    case Published = 'published';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
