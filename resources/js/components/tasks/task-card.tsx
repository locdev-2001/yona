import PriorityBadge from '@/components/tasks/priority-badge';
import TaskStatusBadge from '@/components/tasks/task-status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTranslator } from '@/lib/i18n';
import type { Task } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';

interface Props {
    task: Task;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export default function TaskCard({ task, draggable, onDragStart }: Props) {
    const t = useTranslator();

    const isOverdue = task.due_date && !task.finished_at && new Date(task.due_date) < new Date();

    return (
        <div
            className="rounded-md border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            draggable={draggable}
            onDragStart={draggable && onDragStart ? (e) => onDragStart(e, task.id) : undefined}
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <Link href={route('tasks.show', { task: task.id })} className="line-clamp-2 text-sm font-medium hover:underline">
                    #{task.task_number} {task.name}
                </Link>
                <PriorityBadge priority={task.priority} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />

                {task.due_date && (
                    <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <CalendarDays className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                    </span>
                )}

                {task.milestone && <span className="text-muted-foreground text-xs">{task.milestone.name}</span>}
            </div>

            {task.assignees && task.assignees.length > 0 && (
                <div className="mt-2 flex -space-x-1.5">
                    {task.assignees.slice(0, 4).map((assignee) => (
                        <Avatar key={assignee.id} className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-[10px]">{assignee.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    ))}
                    {task.assignees.length > 4 && (
                        <span className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px]">
                            +{task.assignees.length - 4}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
