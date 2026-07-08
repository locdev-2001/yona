import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

interface Props {
    status: TaskStatus;
    className?: string;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
    1: 'bg-slate-100 text-slate-700', // not_started
    2: 'bg-yellow-100 text-yellow-800', // awaiting_feedback
    3: 'bg-blue-100 text-blue-800', // testing
    4: 'bg-purple-100 text-purple-800', // in_progress
    5: 'bg-green-100 text-green-800', // complete
};

const STATUS_KEYS: Record<TaskStatus, string> = {
    1: 'tasks.status.not_started',
    2: 'tasks.status.awaiting_feedback',
    3: 'tasks.status.testing',
    4: 'tasks.status.in_progress',
    5: 'tasks.status.complete',
};

export default function TaskStatusBadge({ status, className }: Props) {
    const t = useTranslator();

    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status], className)}>
            {t(STATUS_KEYS[status])}
        </span>
    );
}
