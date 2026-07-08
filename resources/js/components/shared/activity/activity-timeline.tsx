import { useTranslator } from '@/lib/i18n';
import type { ActivityItem } from '@/types';
import { ActivityItemCard } from './activity-item';

interface Props {
    activities: ActivityItem[];
    /** Show only customer-visible entries (used in client portal). */
    visibleToCustomerOnly?: boolean;
}

export function ActivityTimeline({ activities, visibleToCustomerOnly = false }: Props) {
    const t = useTranslator();

    const items = visibleToCustomerOnly ? activities.filter((a) => a.visible_to_customer) : activities;

    if (items.length === 0) {
        return <p className="text-muted-foreground py-6 text-center text-sm">{t('activity.empty') ?? 'No activity yet.'}</p>;
    }

    return (
        <div className="divide-border divide-y">
            {items.map((activity) => (
                <ActivityItemCard key={activity.id} activity={activity} />
            ))}
        </div>
    );
}
