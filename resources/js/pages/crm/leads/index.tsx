import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Lead, PaginatedLeads, Pipeline } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Kanban, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    leads: PaginatedLeads;
    pipelines: Pipeline[];
    filters: { search?: string; pipeline?: string; stage?: string };
}

export default function LeadsIndex({ leads, pipelines, filters }: Props) {
    const t = useTranslator();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('leads.title.index') ?? 'Leads', href: route('leads.index') }];

    const applyFilter = useCallback(
        (params: Record<string, string>) => {
            router.get(route('leads.index'), { ...filters, ...params }, { preserveState: true, replace: true });
        },
        [filters],
    );

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search });
    }

    function handlePipelineChange(value: string) {
        applyFilter({ pipeline: value === 'all' ? '' : value, stage: '' });
    }

    function statusBadge(lead: Lead) {
        if (lead.is_lost) return <Badge variant="destructive">{t('leads.status.lost')}</Badge>;
        if (lead.is_junk) return <Badge variant="secondary">{t('leads.status.junk')}</Badge>;
        if (lead.date_converted) return <Badge variant="outline">{t('leads.status.converted')}</Badge>;
        return <Badge variant="default">{t('leads.status.active')}</Badge>;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('leads.title.index') ?? 'Leads'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader
                        title={t('leads.title.index') ?? 'Leads'}
                        description={`${leads.total} ${(t('leads.title.index') ?? 'leads').toLowerCase()}`}
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('leads.kanban')}>
                                <Kanban className="mr-2 h-4 w-4" />
                                {t('leads.actions.view_kanban')}
                            </Link>
                        </Button>
                        <Button size="sm" asChild>
                            <Link href={route('leads.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('leads.actions.create')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder={t('platform.actions.search') ?? 'Search...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64"
                        />
                        <Button type="submit" variant="secondary" size="sm">
                            {t('platform.actions.search') ?? 'Search'}
                        </Button>
                    </form>

                    <Select value={filters.pipeline ?? 'all'} onValueChange={handlePipelineChange}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={t('leads.fields.pipeline')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">— {t('leads.fields.pipeline')}</SelectItem>
                            {pipelines.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground border-b text-left text-xs font-medium tracking-wide uppercase">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">{t('leads.fields.name')}</th>
                                <th className="px-4 py-3">{t('leads.fields.company')}</th>
                                <th className="px-4 py-3">{t('leads.fields.email')}</th>
                                <th className="px-4 py-3">{t('leads.fields.stage')}</th>
                                <th className="px-4 py-3">{t('leads.fields.assigned_to')}</th>
                                <th className="px-4 py-3">{t('leads.fields.lead_value')}</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {leads.data.map((lead) => (
                                <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="text-muted-foreground px-4 py-3 text-xs">#{lead.lead_number}</td>
                                    <td className="px-4 py-3">
                                        <Link href={route('leads.show', lead.id)} className="font-medium hover:underline">
                                            {lead.name}
                                        </Link>
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">{lead.company ?? '—'}</td>
                                    <td className="text-muted-foreground px-4 py-3">{lead.email ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        {lead.stage ? (
                                            <span
                                                className="inline-flex items-center gap-1 text-xs"
                                                style={lead.stage.color ? { color: lead.stage.color } : undefined}
                                            >
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={lead.stage.color ? { background: lead.stage.color } : undefined}
                                                />
                                                {lead.stage.name}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="text-muted-foreground px-4 py-3">{lead.assignee?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {lead.lead_value ? Number(lead.lead_value).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3">{statusBadge(lead)}</td>
                                </tr>
                            ))}
                            {leads.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted-foreground px-4 py-8 text-center text-sm">
                                        {t('leads.kanban.empty_stage')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {leads.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {leads.prev_page_url && (
                            <Button variant="outline" size="sm" onClick={() => router.get(leads.prev_page_url!)}>
                                &larr;
                            </Button>
                        )}
                        <span className="text-muted-foreground flex items-center text-sm">
                            {leads.current_page} / {leads.last_page}
                        </span>
                        {leads.next_page_url && (
                            <Button variant="outline" size="sm" onClick={() => router.get(leads.next_page_url!)}>
                                &rarr;
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
