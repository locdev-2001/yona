import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, ClientGroup } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

interface PaginatedClients {
    data: Client[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

interface Props {
    clients: PaginatedClients;
    groups: ClientGroup[];
    filters: { search?: string; group?: string };
}

export default function ClientsIndex({ clients, groups, filters }: Props) {
    const t = useTranslator();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('clients.title.index') ?? 'Clients', href: route('clients.index') }];

    const applyFilter = useCallback(
        (params: Record<string, string>) => {
            router.get(route('clients.index'), { ...filters, ...params }, { preserveState: true, replace: true });
        },
        [filters],
    );

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search });
    }

    function handleGroupChange(value: string) {
        applyFilter({ group: value === 'all' ? '' : value });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('clients.title.index') ?? 'Clients'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader
                        title={t('clients.title.index') ?? 'Clients'}
                        description={`${clients.total} ${t('clients.title.index')?.toLowerCase() ?? 'clients'}`}
                    />
                    <Button asChild size="sm">
                        <Link href={route('clients.create')}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t('clients.actions.create') ?? 'Add Client'}
                        </Link>
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder={t('clients.actions.search') ?? 'Search...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-60"
                        />
                        <Button type="submit" variant="outline" size="sm">
                            {t('clients.actions.search')}
                        </Button>
                    </form>

                    <Select value={filters.group ?? 'all'} onValueChange={handleGroupChange}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('clients.actions.filter_by_group') ?? 'Filter by group'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('clients.actions.all_groups') ?? 'All groups'}</SelectItem>
                            {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                    {g.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {clients.data.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-16">
                        <Building2 className="h-10 w-10 opacity-30" />
                        <p className="text-sm">{t('clients.empty') ?? 'No clients yet.'}</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b text-left">
                                    <th className="px-4 py-3 font-medium">{t('clients.fields.name')}</th>
                                    <th className="px-4 py-3 font-medium">{t('clients.contact.title')}</th>
                                    <th className="px-4 py-3 font-medium">{t('clients.fields.phone')}</th>
                                    <th className="px-4 py-3 font-medium">{t('clients.fields.groups')}</th>
                                    <th className="px-4 py-3 font-medium">{t('clients.fields.owner')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.data.map((client) => (
                                    <tr key={client.id} className="hover:bg-muted/20 border-b last:border-0">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('clients.show', { client: client.id })}
                                                className="font-medium underline-offset-2 hover:underline"
                                            >
                                                {client.name}
                                            </Link>
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3">
                                            {client.primary_contact
                                                ? `${client.primary_contact.first_name} ${client.primary_contact.last_name ?? ''}`.trim()
                                                : '—'}
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3">{client.phone ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(client.groups ?? []).map((g) => (
                                                    <Badge key={g.id} variant="secondary" className="text-xs">
                                                        {g.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3">{client.owner?.name ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {clients.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {clients.prev_page_url ? (
                            <Link
                                href={clients.prev_page_url}
                                className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
                            >
                                &larr; {t('common.prev') ?? 'Previous'}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">&larr;</span>
                        )}
                        <span className="text-muted-foreground text-sm">
                            {clients.current_page} / {clients.last_page}
                        </span>
                        {clients.next_page_url ? (
                            <Link
                                href={clients.next_page_url}
                                className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
                            >
                                {t('common.next') ?? 'Next'} &rarr;
                            </Link>
                        ) : (
                            <span className="text-muted-foreground/40 text-sm">&rarr;</span>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
