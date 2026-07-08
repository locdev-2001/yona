import { useTranslator } from '@/lib/i18n';
import type { ActivityItem } from '@/types';

interface Props {
    activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: Props) {
    const t = useTranslator();

    if (activities.length === 0) {
        return <p className="text-muted-foreground text-sm">No activity yet.</p>;
    }

    return (
        <ol className="space-y-3">
            {activities.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                    <span className="bg-primary/60 ring-background mt-0.5 h-2 w-2 shrink-0 rounded-full ring-2" />
                    <div>
                        <p className="font-medium">{t('projects.activity.' + item.action) ?? item.action}</p>
                        <p className="text-muted-foreground text-xs">
                            {item.actor_name ?? '—'} · {new Date(item.occurred_at).toLocaleString()}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
