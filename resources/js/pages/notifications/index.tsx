import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, NotificationItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck } from 'lucide-react';

interface PaginatedNotifications {
    data: NotificationItem[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    notifications: PaginatedNotifications;
    unread_count: number;
}

export default function NotificationsIndex({ notifications, unread_count }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('notification.page.title'), href: route('notifications.index') }];

    function handleMarkAll() {
        router.post(route('notifications.read-all'), {}, { preserveScroll: true });
    }

    function handleMarkRead(id: string) {
        router.post(route('notifications.read', { id }), {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('notification.page.title')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader title={t('notification.page.title')} description={t('notification.page.subtitle')} />

                    {unread_count > 0 && (
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAll}>
                            <CheckCheck className="h-4 w-4" />
                            {t('notification.page.mark_all_read')}
                        </Button>
                    )}
                </div>

                {notifications.data.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center text-sm">{t('notification.page.empty')}</p>
                ) : (
                    <div className="divide-border divide-y rounded-lg border">
                        {notifications.data.map((n) => (
                            <div key={n.id} className={`flex items-start gap-4 px-4 py-4 ${!n.read_at ? 'bg-muted/30' : ''}`}>
                                {!n.read_at && <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full" />}
                                {n.read_at && <span className="mt-2 h-2 w-2 shrink-0" />}

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm">{t(`notification.actions.${n.action ?? ''}`) ?? n.action}</p>
                                    <p className="text-muted-foreground mt-0.5 text-xs">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {n.read_at ? (
                                        <Badge variant="secondary" className="text-xs">
                                            {t('notification.page.filter_unread') ? '' : 'Read'}
                                        </Badge>
                                    ) : (
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkRead(n.id)}>
                                            {t('notification.panel.mark_read')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {notifications.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {notifications.prev_page_url && (
                            <Link href={notifications.prev_page_url}>
                                <Button variant="outline" size="sm">
                                    ←
                                </Button>
                            </Link>
                        )}
                        <span className="text-muted-foreground flex items-center text-sm">
                            {notifications.current_page} / {notifications.last_page}
                        </span>
                        {notifications.next_page_url && (
                            <Link href={notifications.next_page_url}>
                                <Button variant="outline" size="sm">
                                    →
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
