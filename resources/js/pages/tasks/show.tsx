import ChecklistPanel from '@/components/tasks/checklist-panel';
import PriorityBadge from '@/components/tasks/priority-badge';
import TaskStatusBadge from '@/components/tasks/task-status-badge';
import TimerWidget from '@/components/tasks/timer-widget';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Task, TaskStatus } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Edit, Trash2 } from 'lucide-react';

interface Props {
    task: Task;
    can: { update: boolean; delete: boolean; log_time: boolean };
}

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
    { value: '1', labelKey: 'tasks.status.not_started' },
    { value: '2', labelKey: 'tasks.status.awaiting_feedback' },
    { value: '3', labelKey: 'tasks.status.testing' },
    { value: '4', labelKey: 'tasks.status.in_progress' },
    { value: '5', labelKey: 'tasks.status.complete' },
];

export default function TaskShow({ task, can }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('tasks.title.index') ?? 'Tasks', href: route('tasks.index') },
        { title: `#${task.task_number} ${task.name}`, href: route('tasks.show', { task: task.id }) },
    ];

    function handleStatusChange(value: string) {
        router.patch(route('tasks.status', { task: task.id }), { status: parseInt(value, 10) });
    }

    function handleDelete() {
        if (!confirm(t('tasks.actions.delete') ?? 'Delete?')) return;
        router.delete(route('tasks.destroy', { task: task.id }));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`#${task.task_number} ${task.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            #{task.task_number}
                            {task.related_type && <span>· {t(`tasks.related_type.${task.related_type}`)}</span>}
                        </div>
                        <h1 className="text-xl font-semibold">{task.name}</h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <TaskStatusBadge status={task.status as TaskStatus} />
                            <PriorityBadge priority={task.priority} />
                            {task.due_date && (
                                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                                    <CalendarDays className="h-3 w-3" />
                                    {task.due_date}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {can.update && (
                            <>
                                <Select value={String(task.status)} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {t(s.labelKey)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button variant="outline" size="icon" asChild>
                                    <Link href={route('tasks.show', { task: task.id })}>
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </>
                        )}
                        {can.delete && (
                            <Button variant="destructive" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Description */}
                        {task.description && (
                            <div>
                                <h3 className="mb-1 text-sm font-semibold">{t('tasks.fields.description')}</h3>
                                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{task.description}</p>
                            </div>
                        )}

                        <Separator />

                        {/* Checklist */}
                        <ChecklistPanel task={task} canUpdate={can.update} />

                        <Separator />

                        {/* Timers */}
                        <TimerWidget task={task} canLogTime={can.log_time} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Assignees */}
                        <div>
                            <h3 className="mb-1 text-sm font-semibold">{t('tasks.fields.assignees')}</h3>
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="space-y-1">
                                    {task.assignees.map((a) => (
                                        <div key={a.id} className="text-sm">
                                            {a.name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                            )}
                        </div>

                        {/* Milestone */}
                        {task.milestone && (
                            <div>
                                <h3 className="mb-1 text-sm font-semibold">{t('tasks.fields.milestone')}</h3>
                                <span className="text-sm">{task.milestone.name}</span>
                            </div>
                        )}

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                            <div>
                                <h3 className="mb-1 text-sm font-semibold">Tags</h3>
                                <div className="flex flex-wrap gap-1">
                                    {task.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                                            style={{ backgroundColor: tag.color ?? '#e2e8f0' }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="space-y-2 text-sm">
                            {task.start_date && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('tasks.fields.start_date')}</span>
                                    <span>{task.start_date}</span>
                                </div>
                            )}
                            {task.due_date && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('tasks.fields.due_date')}</span>
                                    <span>{task.due_date}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
