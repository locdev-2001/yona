import TaskForm from '@/components/tasks/task-form';
import TaskKanbanColumn from '@/components/tasks/task-kanban-column';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Task, TaskKanbanColumns, TaskStatus, User } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type RecordOption = { id: string; name: string };
type MemberOption = Pick<User, 'id' | 'name'>;

interface Props {
    columns: TaskKanbanColumns;
    can: { create: boolean; update: boolean };
    relatedRecords?: Record<string, RecordOption[]>;
    members?: MemberOption[];
}

// Display order for kanban columns (not necessarily sorted by id)
const STATUS_DISPLAY_ORDER: TaskStatus[] = [1, 4, 3, 2, 5]; // not_started → in_progress → testing → awaiting_feedback → complete

const STATUS_KEYS: Record<TaskStatus, string> = {
    1: 'tasks.status.not_started',
    2: 'tasks.status.awaiting_feedback',
    3: 'tasks.status.testing',
    4: 'tasks.status.in_progress',
    5: 'tasks.status.complete',
};

export default function TasksKanban({ columns, can, relatedRecords = {}, members = [] }: Props) {
    const t = useTranslator();
    const [createOpen, setCreateOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('tasks.title.index') ?? 'Tasks', href: route('tasks.index') },
        { title: t('tasks.title.kanban') ?? 'Kanban', href: route('tasks.kanban') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('tasks.title.kanban') ?? 'Kanban'} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">{t('tasks.title.kanban')}</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('tasks.index')}>{t('tasks.title.index')}</Link>
                        </Button>
                        {/* BUG-16 fix: open create dialog instead of navigating away */}
                        {can.create && (
                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" />
                                {t('tasks.actions.create')}
                            </Button>
                        )}
                    </div>
                </div>

                <p className="text-muted-foreground text-xs">{t('tasks.kanban.drag_hint')}</p>

                <div className="flex gap-4 overflow-x-auto pb-4">
                    {STATUS_DISPLAY_ORDER.map((status) => (
                        <TaskKanbanColumn
                            key={status}
                            status={status}
                            label={t(STATUS_KEYS[status]) ?? String(status)}
                            tasks={(columns[String(status)] ?? []) as Task[]}
                            canUpdate={can.update}
                        />
                    ))}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('tasks.actions.create')}</DialogTitle>
                    </DialogHeader>
                    <TaskForm
                        submitRoute={route('tasks.store')}
                        onSuccess={() => setCreateOpen(false)}
                        relatedRecords={relatedRecords}
                        members={members}
                    />
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
