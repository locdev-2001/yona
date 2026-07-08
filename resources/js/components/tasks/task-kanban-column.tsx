import TaskCard from '@/components/tasks/task-card';
import { useTranslator } from '@/lib/i18n';
import type { Task, TaskStatus } from '@/types';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    status: TaskStatus;
    label: string;
    tasks: Task[];
    canUpdate: boolean;
}

export default function TaskKanbanColumn({ status, label, tasks, canUpdate }: Props) {
    const t = useTranslator();
    const [isDragOver, setIsDragOver] = useState(false);

    function handleDragStart(e: React.DragEvent, taskId: string) {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('fromStatus', String(status));
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(true);
    }

    function handleDragLeave() {
        setIsDragOver(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(false);

        const taskId = e.dataTransfer.getData('taskId');
        const fromStatus = parseInt(e.dataTransfer.getData('fromStatus'), 10);

        if (!taskId || !canUpdate) return;

        // Only process if dropped to different column
        if (fromStatus === status) return;

        router.patch(route('tasks.kanban-order', { task: taskId }), {
            status: status,
            order: tasks.length + 1,
        });
    }

    return (
        <div
            className={`bg-muted/40 flex min-h-[200px] w-72 flex-shrink-0 flex-col rounded-lg border p-2 transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{label}</h3>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">{tasks.length}</span>
            </div>

            <div className="flex flex-col gap-2">
                {tasks.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-xs">{t('tasks.kanban.empty_column')}</p>
                ) : (
                    tasks.map((task) => <TaskCard key={task.id} task={task} draggable={canUpdate} onDragStart={handleDragStart} />)
                )}
            </div>
        </div>
    );
}
