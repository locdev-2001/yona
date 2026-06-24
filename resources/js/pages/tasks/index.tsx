import PriorityBadge from '@/components/tasks/priority-badge';
import TaskStatusBadge from '@/components/tasks/task-status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, PaginatedTasks, Task, TaskStatus } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    tasks: PaginatedTasks;
    filters: { status?: string; search?: string };
    can: { create: boolean };
}

const STATUS_LABELS: Record<string, string> = {
    '1': 'tasks.status.not_started',
    '2': 'tasks.status.awaiting_feedback',
    '3': 'tasks.status.testing',
    '4': 'tasks.status.in_progress',
    '5': 'tasks.status.complete',
};

export default function TasksIndex({ tasks, filters, can }: Props) {
    const t = useTranslator();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('tasks.title.index') ?? 'Tasks', href: route('tasks.index') }];

    const applyFilter = useCallback(
        (params: Record<string, string>) => {
            router.get(route('tasks.index'), { ...filters, ...params }, { preserveState: true, replace: true });
        },
        [filters],
    );

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('tasks.title.index') ?? 'Tasks'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">{t('tasks.title.index')}</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('tasks.kanban')}>{t('tasks.title.kanban')}</Link>
                        </Button>
                        {can.create && (
                            <Button size="sm" asChild>
                                <Link href="#task-create">
                                    <Plus className="mr-1 h-4 w-4" />
                                    {t('tasks.actions.create')}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder={t('tasks.actions.search') ?? 'Search...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-56"
                        />
                        <Button type="submit" variant="outline" size="sm">
                            {t('tasks.actions.search')}
                        </Button>
                    </form>

                    <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter({ status: v === 'all' ? '' : v })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('tasks.filters.all_statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('tasks.filters.all_statuses')}</SelectItem>
                            {Object.entries(STATUS_LABELS).map(([v, key]) => (
                                <SelectItem key={v} value={v}>
                                    {t(key)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>{t('tasks.fields.name')}</TableHead>
                                <TableHead>{t('tasks.fields.status')}</TableHead>
                                <TableHead>{t('tasks.fields.priority')}</TableHead>
                                <TableHead>{t('tasks.fields.assignees')}</TableHead>
                                <TableHead>{t('tasks.fields.due_date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                        {t('tasks.kanban.empty_column')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.data.map((task: Task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="text-muted-foreground">#{task.task_number}</TableCell>
                                        <TableCell>
                                            <Link href={route('tasks.show', { task: task.id })} className="font-medium hover:underline">
                                                {task.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <TaskStatusBadge status={task.status as TaskStatus} />
                                        </TableCell>
                                        <TableCell>
                                            <PriorityBadge priority={task.priority} />
                                        </TableCell>
                                        <TableCell>{task.assignees?.map((a) => a.name).join(', ') ?? '—'}</TableCell>
                                        <TableCell>{task.due_date ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {(tasks.prev_page_url || tasks.next_page_url) && (
                    <div className="flex justify-end gap-2">
                        {tasks.prev_page_url && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={tasks.prev_page_url}>←</Link>
                            </Button>
                        )}
                        <span className="text-muted-foreground flex items-center text-sm">
                            {tasks.current_page} / {tasks.last_page}
                        </span>
                        {tasks.next_page_url && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={tasks.next_page_url}>→</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
