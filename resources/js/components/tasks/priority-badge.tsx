import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/types';

interface Props {
    priority: TaskPriority;
    className?: string;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
    1: 'bg-slate-100 text-slate-600', // low
    2: 'bg-blue-100 text-blue-700', // medium
    3: 'bg-orange-100 text-orange-700', // high
    4: 'bg-red-100 text-red-700', // urgent
};

const PRIORITY_KEYS: Record<TaskPriority, string> = {
    1: 'tasks.priority.low',
    2: 'tasks.priority.medium',
    3: 'tasks.priority.high',
    4: 'tasks.priority.urgent',
};

export default function PriorityBadge({ priority, className }: Props) {
    const t = useTranslator();

    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PRIORITY_STYLES[priority], className)}>
            {t(PRIORITY_KEYS[priority])}
        </span>
    );
}
