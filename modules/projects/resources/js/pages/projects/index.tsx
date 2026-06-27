import { PageHeader } from '@/components/page-header';
import StatusBadge from '@/components/projects/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, PaginatedProjects, ProjectStatus } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Pin, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    projects: PaginatedProjects;
    statuses: ProjectStatus[];
    filters: { search?: string; status?: string; pinned?: string };
    can: { create: boolean };
}

export default function ProjectsIndex({ projects, statuses, filters, can }: Props) {
    const t = useTranslator();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('projects.title.index') ?? 'Projects', href: route('projects.index') }];

    const applyFilter = useCallback(
        (params: Record<string, string | boolean>) => {
            router.get(route('projects.index'), { ...filters, ...params }, { preserveState: true, replace: true });
        },
        [filters],
    );

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('projects.title.index') ?? 'Projects'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader
                        title={t('projects.title.index') ?? 'Projects'}
                        description={`${projects.total} ${(t('projects.title.index') ?? 'projects').toLowerCase()}`}
                    />
                    {can.create && (
                        <Button asChild size="sm">
                            <Link href={route('projects.create')}>
                                <Plus className="mr-1 h-4 w-4" />
                                {t('projects.actions.create')}
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder={t('projects.actions.search') ?? 'Search...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-60"
                        />
                        <Button type="submit" variant="outline" size="sm">
                            {t('projects.actions.search')}
                        </Button>
                    </form>

                    <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter({ status: v === 'all' ? '' : v })}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('projects.filters.all_statuses')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('projects.filters.all_statuses')}</SelectItem>
                            {statuses.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b">
                                <th className="px-4 py-3 text-left font-medium">#</th>
                                <th className="px-4 py-3 text-left font-medium">{t('projects.fields.name')}</th>
                                <th className="px-4 py-3 text-left font-medium">{t('projects.fields.client')}</th>
                                <th className="px-4 py-3 text-left font-medium">{t('projects.fields.status')}</th>
                                <th className="px-4 py-3 text-left font-medium">{t('projects.fields.progress')}</th>
                                <th className="px-4 py-3 text-left font-medium">{t('projects.fields.deadline')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                                        No projects found.
                                    </td>
                                </tr>
                            )}
                            {projects.data.map((project) => (
                                <tr key={project.id} className="hover:bg-muted/20 border-b last:border-0">
                                    <td className="text-muted-foreground px-4 py-3">#{project.project_number}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {project.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
                                            <Link href={route('projects.show', project.id)} className="font-medium hover:underline">
                                                {project.name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">{project.client?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={project.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                                                <div
                                                    className="bg-primary h-full rounded-full transition-all"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-muted-foreground text-xs">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">
                                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="text-muted-foreground flex justify-between text-sm">
                    <span>Total: {projects.total}</span>
                    <div className="flex gap-2">
                        {projects.prev_page_url && (
                            <Button size="sm" variant="outline" onClick={() => router.get(projects.prev_page_url!)}>
                                Previous
                            </Button>
                        )}
                        {projects.next_page_url && (
                            <Button size="sm" variant="outline" onClick={() => router.get(projects.next_page_url!)}>
                                Next
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
