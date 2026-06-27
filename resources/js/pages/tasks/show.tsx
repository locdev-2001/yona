import ChecklistPanel from '@/components/tasks/checklist-panel';
import PriorityBadge from '@/components/tasks/priority-badge';
import TaskForm from '@/components/tasks/task-form';
import TaskStatusBadge from '@/components/tasks/task-status-badge';
import TimerWidget from '@/components/tasks/timer-widget';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Task, TaskStatus, User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarDays, Edit, Loader2, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

type RecordOption = { id: string; name: string };
type MemberOption = Pick<User, 'id' | 'name'>;

interface Props {
    task: Task;
    can: { update: boolean; delete: boolean; log_time: boolean };
    relatedRecords?: Record<string, RecordOption[]>;
    members?: MemberOption[];
}

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
    { value: '1', labelKey: 'tasks.status.not_started' },
    { value: '2', labelKey: 'tasks.status.awaiting_feedback' },
    { value: '3', labelKey: 'tasks.status.testing' },
    { value: '4', labelKey: 'tasks.status.in_progress' },
    { value: '5', labelKey: 'tasks.status.complete' },
];

export default function TaskShow({ task, can, relatedRecords = {}, members = [] }: Props) {
    const t = useTranslator();
    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignProcessing, setAssignProcessing] = useState(false);

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

    // BUG-10: sync assignees via PATCH /tasks/{task}/assignees
    function syncAssignees(newIds: number[]) {
        setAssignProcessing(true);
        router.patch(route('tasks.assignees.update', { task: task.id }), { user_ids: newIds }, { onFinish: () => setAssignProcessing(false) });
    }

    function toggleAssignee(userId: number) {
        const current = task.assignees?.map((a) => a.id) ?? [];
        const updated = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
        syncAssignees(updated);
    }

    const assigneeIds = task.assignees?.map((a) => a.id) ?? [];

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

                                {/* BUG-09 fix: open edit dialog instead of self-link */}
                                <Button variant="outline" size="icon" onClick={() => setEditOpen(true)}>
                                    <Edit className="h-4 w-4" />
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
                        {/* BUG-10 fix: Assignees panel with inline popover picker */}
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">{t('tasks.fields.assignees')}</h3>
                                {can.update && members.length > 0 && (
                                    <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                {assignProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-2">
                                            <div className="space-y-1">
                                                {members.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
                                                        onClick={() => toggleAssignee(m.id)}
                                                        disabled={assignProcessing}
                                                    >
                                                        {m.name}
                                                        {assigneeIds.includes(m.id) && <span className="text-primary ml-auto text-xs">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
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

            {/* BUG-09 fix: edit dialog */}
            {can.update && (
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('tasks.actions.edit') ?? 'Edit Task'}</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                            task={task}
                            submitRoute={route('tasks.update', { task: task.id })}
                            method="patch"
                            onSuccess={() => setEditOpen(false)}
                            relatedRecords={relatedRecords}
                            members={members}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
