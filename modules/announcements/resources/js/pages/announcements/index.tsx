import { AnnouncementCard } from '@modules/announcements/resources/js/components/announcements/announcement-card';
import { WhatsNewModal } from '@modules/announcements/resources/js/components/announcements/whats-new-modal';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import { type Announcement, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

interface PaginatedAnnouncements {
    data: Announcement[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    announcements: PaginatedAnnouncements;
}

export default function AnnouncementsIndex({ announcements }: Props) {
    const t = useTranslator();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.announcements.page_title'), href: '/whats-new' }];

    function handleMarkRead(id: string) {
        router.post(route('announcements.read', { announcement: id }), {}, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.announcements.page_title')} />

            {/* Auto-popup modal for latest unread (once per session) */}
            <WhatsNewModal />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader title={t('platform.announcements.page_title')} description={t('platform.announcements.page_subtitle')} />

                {announcements.data.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center text-sm">{t('platform.announcements.empty')}</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {announcements.data.map((announcement) => (
                            <AnnouncementCard key={announcement.id} announcement={announcement} onMarkRead={handleMarkRead} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {announcements.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {announcements.prev_page_url ? (
                            <Link
                                href={announcements.prev_page_url}
                                className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
                            >
                                &larr; Previous
                            </Link>
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">&larr; Previous</span>
                        )}

                        <span className="text-muted-foreground text-sm tabular-nums">
                            {announcements.current_page} / {announcements.last_page}
                        </span>

                        {announcements.next_page_url ? (
                            <Link
                                href={announcements.next_page_url}
                                className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
                            >
                                Next &rarr;
                            </Link>
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">Next &rarr;</span>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
