import { Badge } from '@/components/ui/badge';
import { useTranslator } from '@/lib/i18n';
import type { ActivityItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Tag } from 'lucide-react';

interface Props {
    activity: ActivityItem;
}

export function ActivityItemCard({ activity }: Props) {
    const t = useTranslator();

    const timeAgo = formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true });

    return (
        <div className="flex gap-3 py-3">
            <div className="bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <Activity className="text-muted-foreground h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm leading-snug">{activity.message}</p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">{timeAgo}</span>

                    {activity.visible_to_customer && (
                        <Badge variant="outline" className="h-4 gap-1 px-1.5 py-0 text-[10px]">
                            <Tag className="h-2.5 w-2.5" />
                            {t('activity.visible_customer') ?? 'Client visible'}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
