<?php

namespace App\Enums;

/**
 * Announcement category — classifies the type of change/update.
 * Source of truth; mirrored to TypeScript in Phase 3.
 */
enum AnnouncementCategory: string
{
    case Feature = 'feature';
    case Improvement = 'improvement';
    case Fix = 'fix';
    case Announcement = 'announcement';
    case Maintenance = 'maintenance';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
