import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslator } from '@/lib/i18n';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { NotificationPanel } from './notification-panel';

export function NotificationBell() {
    const t = useTranslator();
    const { notifications } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);

    if (!notifications) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label={t('notification.panel.title')}>
                    <Bell className="h-4 w-4" />
                    {notifications.unread > 0 && (
                        <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                            {notifications.unread > 99 ? '99+' : notifications.unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0">
                <NotificationPanel data={notifications} onClose={() => setOpen(false)} />
            </PopoverContent>
        </Popover>
    );
}
