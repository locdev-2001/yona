import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import type { NotificationsBell } from '@/types';
import { Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
    data: NotificationsBell;
    onClose: () => void;
}

export function NotificationPanel({ data, onClose }: Props) {
    const t = useTranslator();

    function handleMarkRead(id: string) {
        router.post(route('notifications.read', { id }), {}, { preserveScroll: true });
    }

    function handleMarkAll() {
        router.post(route('notifications.read-all'), {}, { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <div className="flex w-80 flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-medium">{t('notification.panel.title')}</span>
                {data.unread > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAll}>
                        {t('notification.panel.mark_all_read')}
                    </Button>
                )}
            </div>

            {data.recent.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">{t('notification.panel.empty')}</p>
            ) : (
                <div className="divide-border divide-y">
                    {data.recent.map((n) => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm">{t(`notification.actions.${n.action}`) ?? n.action}</p>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleMarkRead(n.id)}>
                                <span className="sr-only">{t('notification.panel.mark_read')}</span>
                                <span className="bg-primary h-2 w-2 rounded-full" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t px-4 py-2">
                <Link href={route('notifications.index')} className="text-primary text-xs hover:underline" onClick={onClose}>
                    {t('notification.panel.view_all')}
                </Link>
            </div>
        </div>
    );
}
