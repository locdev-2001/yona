import { AnnouncementBody } from '@/components/announcements/announcement-body';
import { Badge } from '@/components/ui/badge';
import { useTranslator } from '@/lib/i18n';
import { type Announcement, type AnnouncementCategory } from '@/types';
import { usePage } from '@inertiajs/react';

// Category → Tailwind variant mapping (class-first, static for tree-shaking).
const CATEGORY_VARIANT: Record<AnnouncementCategory, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    feature: 'default',
    improvement: 'secondary',
    fix: 'destructive',
    announcement: 'outline',
    maintenance: 'outline',
};

/**
 * Formats a UTC ISO date string as a locale-aware relative time string.
 * Uses Intl.RelativeTimeFormat — no external dependencies.
 */
function useRelativeTime(isoDate: string | null): string {
    const { locale } = usePage<{ locale: string }>().props;

    if (!isoDate) return '';

    const diffMs = new Date(isoDate).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1_000);
    const absS = Math.abs(diffSec);

    const rtf = new Intl.RelativeTimeFormat(locale ?? 'vi', { numeric: 'auto' });

    if (absS < 60) return rtf.format(diffSec, 'second');
    if (absS < 3_600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (absS < 86_400) return rtf.format(Math.round(diffSec / 3_600), 'hour');
    if (absS < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), 'day');
    if (absS < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), 'month');
    return rtf.format(Math.round(diffSec / 31_536_000), 'year');
}

interface AnnouncementCardProps {
    announcement: Announcement;
    onMarkRead?: (id: string) => void;
}

export function AnnouncementCard({ announcement, onMarkRead }: AnnouncementCardProps) {
    const t = useTranslator();
    const relativeTime = useRelativeTime(announcement.published_at);
    const categoryLabel = t(`platform.announcements.category.${announcement.category}`);
    const variant = CATEGORY_VARIANT[announcement.category] ?? 'outline';

    return (
        <article className="bg-card border-border flex flex-col gap-4 rounded-lg border p-5">
            {/* Cover image */}
            {announcement.cover_image && (
                <img src={announcement.cover_image} alt="" aria-hidden="true" className="h-40 w-full rounded-md object-cover" />
            )}

            {/* Header row */}
            <div className="flex items-start gap-3">
                <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant={variant}>{categoryLabel}</Badge>
                        {!announcement.is_read && <span aria-label="Unread" className="bg-primary inline-block h-2 w-2 rounded-full" />}
                    </div>
                    <h3 className="text-base leading-snug font-semibold">{announcement.title}</h3>
                    <time dateTime={announcement.published_at ?? undefined} className="text-muted-foreground text-xs">
                        {relativeTime}
                    </time>
                </div>

                {/* Mark-read action (only when unread) */}
                {!announcement.is_read && onMarkRead && (
                    <button
                        type="button"
                        onClick={() => onMarkRead(announcement.id)}
                        className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline-offset-2 hover:underline"
                    >
                        {t('platform.announcements.mark_read')}
                    </button>
                )}
            </div>

            {/* Body */}
            <AnnouncementBody bodyHtml={announcement.body_html} />
        </article>
    );
}
