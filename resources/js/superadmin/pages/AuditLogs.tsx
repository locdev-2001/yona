import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, ListFilterIcon, ScrollTextIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Badge } from '@admin/components/ui/badge';
import { Button } from '@admin/components/ui/button';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { FilterSelect, ListFilters } from '@admin/views/datatables/list/list-filters';
import { ListPagination } from '@admin/views/datatables/list/list-pagination';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { ListToolbar } from '@admin/views/datatables/list/list-toolbar';
import StatusBadge from '@admin/views/datatables/status-badge';
import type { StatusTone } from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatDateTime, formatNumber, visitWithParams } from './operationsFormat';

type AuditLog = {
    id: number;
    superAdminId: number | null;
    superAdminEmail: string | null;
    action: string;
    subjectType: string | null;
    subjectId: number | null;
    subjectUrl: string | null;
    changes: Record<string, unknown> | null;
    responseStatus: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string | null;
};

type FilterKey = 'super_admin_id' | 'action' | 'subject_type' | 'subject_id' | 'from' | 'to';
type Filters = Partial<Record<FilterKey, string>>;

type Props = {
    logs: AuditLog[];
    pagination: { current: number; last: number; total: number };
    filters: Filters;
    options: { superAdmins: { value: string; label: string }[]; subjectTypes: string[] };
};

const PAGE_URL = '/admin/audit_logs';

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.AUDIT_LOGS.${key}`, params);

function statusTone(status: number | null): StatusTone {
    if (status === null) return 'neutral';
    if (status >= 500) return 'danger';
    if (status >= 400) return 'warning';

    return 'success';
}

export function pageHref(filters: Filters, page: number): string {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (page > 1) query.set('page', String(page));
    const search = query.toString();

    return search ? `${PAGE_URL}?${search}` : PAGE_URL;
}

function Subject({ log }: { log: AuditLog }) {
    if (!log.subjectType) return <span className="text-muted-foreground">-</span>;
    const text = `${log.subjectType}${log.subjectId ? ` #${log.subjectId}` : ''}`;

    return log.subjectUrl ? (
        <Link href={log.subjectUrl} className="font-medium hover:underline">
            {text}
        </Link>
    ) : (
        <span>{text}</span>
    );
}

function Payload({ log }: { log: AuditLog }) {
    return (
        <div className="flex flex-col gap-2">
            {log.changes ? (
                <pre className="bg-muted max-h-80 overflow-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap">
                    {JSON.stringify(log.changes, null, 2)}
                </pre>
            ) : (
                <p className="text-muted-foreground">{label('NO_PAYLOAD')}</p>
            )}
            {log.userAgent ? <p className="text-muted-foreground text-xs break-all">{log.userAgent}</p> : null}
        </div>
    );
}

export default function AuditLogs({ logs, pagination, filters, options }: Props) {
    const [draft, setDraft] = useState<Filters>(filters);
    const [expanded, setExpanded] = useState<number | null>(null);
    const ids = { admin: useId(), action: useId(), subjectType: useId(), subjectId: useId(), from: useId(), to: useId() };
    const hasFilters = Object.values(filters).some(Boolean);
    const set = (key: FilterKey, value: string) => setDraft(current => ({ ...current, [key]: value }));

    const submit = (event: FormEvent) => {
        event.preventDefault();
        visitWithParams(PAGE_URL, draft);
    };

    const columns: ColumnDef<AuditLog>[] = [
        {
            id: 'time',
            header: () => label('COLUMNS.TIME'),
            cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
        },
        {
            id: 'admin',
            header: () => label('COLUMNS.ADMIN'),
            cell: ({ row }) => (
                <div className="flex min-w-40 flex-col">
                    <span className="font-medium break-all">{row.original.superAdminEmail ?? label('DELETED_ADMIN')}</span>
                    {row.original.ipAddress ? <span className="text-muted-foreground">{row.original.ipAddress}</span> : null}
                </div>
            ),
        },
        {
            id: 'action',
            header: () => label('COLUMNS.ACTION'),
            cell: ({ row }) => (
                <Badge variant="outline" className="h-auto rounded-sm font-mono break-all whitespace-normal">
                    {row.original.action}
                </Badge>
            ),
        },
        {
            id: 'subject',
            header: () => label('COLUMNS.SUBJECT'),
            cell: ({ row }) => <Subject log={row.original} />,
            meta: { cellClassName: 'whitespace-nowrap' },
        },
        {
            id: 'status',
            header: () => label('COLUMNS.STATUS'),
            cell: ({ row }) => <StatusBadge tone={statusTone(row.original.responseStatus)}>{row.original.responseStatus ?? '-'}</StatusBadge>,
        },
        {
            id: 'payload',
            header: () => <span className="sr-only">{label('PAYLOAD')}</span>,
            cell: ({ row }) => {
                const isOpen = expanded === row.original.id;

                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-expanded={isOpen}
                        aria-label={label('PAYLOAD')}
                        onClick={() => setExpanded(current => (current === row.original.id ? null : row.original.id))}
                    >
                        {isOpen ? <ChevronUpIcon className="size-4.5" /> : <ChevronDownIcon className="size-4.5" />}
                    </Button>
                );
            },
            meta: { headerClassName: 'w-14', cellClassName: 'w-14' },
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            <ListCard
                filters={
                    <form onSubmit={submit}>
                        <ListFilters className="lg:grid-cols-5">
                            <FilterSelect
                                id={ids.admin}
                                label={label('FILTERS.ADMIN')}
                                allLabel={label('FILTERS.ALL_ADMINS')}
                                options={options.superAdmins}
                                value={draft.super_admin_id ?? ''}
                                onChange={value => set('super_admin_id', value)}
                            />
                            <FilterSelect
                                id={ids.subjectType}
                                label={label('FILTERS.SUBJECT_TYPE')}
                                allLabel={label('FILTERS.ALL_SUBJECTS')}
                                options={options.subjectTypes.map(type => ({ value: type, label: type }))}
                                value={draft.subject_type ?? ''}
                                onChange={value => set('subject_type', value)}
                            />
                            <div className="flex w-full flex-col gap-2">
                                <Label htmlFor={ids.subjectId}>{label('FILTERS.SUBJECT_ID')}</Label>
                                <Input
                                    id={ids.subjectId}
                                    inputMode="numeric"
                                    value={draft.subject_id ?? ''}
                                    onChange={event => set('subject_id', event.target.value)}
                                />
                            </div>
                            <div className="flex w-full flex-col gap-2">
                                <Label htmlFor={ids.from}>{label('FILTERS.FROM')}</Label>
                                <Input id={ids.from} type="date" value={draft.from ?? ''} onChange={event => set('from', event.target.value)} />
                            </div>
                            <div className="flex w-full flex-col gap-2">
                                <Label htmlFor={ids.to}>{label('FILTERS.TO')}</Label>
                                <Input id={ids.to} type="date" value={draft.to ?? ''} onChange={event => set('to', event.target.value)} />
                            </div>
                        </ListFilters>
                        <ListToolbar
                            search={{
                                id: ids.action,
                                label: label('COLUMNS.ACTION'),
                                placeholder: label('FILTERS.ACTION'),
                                value: draft.action ?? '',
                                onChange: value => set('action', value),
                            }}
                        >
                            {hasFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDraft({});
                                        visitWithParams(PAGE_URL, {});
                                    }}
                                >
                                    <XIcon />
                                    {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                                </Button>
                            ) : null}
                            <Button type="submit">
                                <ListFilterIcon />
                                {t('ADMIN_OPERATIONS.COMMON.APPLY')}
                            </Button>
                        </ListToolbar>
                    </form>
                }
                table={
                    <ListTable
                        data={logs}
                        columns={columns}
                        getRowId={log => String(log.id)}
                        expandedRowId={expanded === null ? null : String(expanded)}
                        renderExpanded={log => <Payload log={log} />}
                        empty={
                            <DataTableEmpty
                                icon={<ScrollTextIcon className="size-4" />}
                                title={label('EMPTY_TITLE')}
                                description={label('EMPTY_DESCRIPTION')}
                            />
                        }
                    />
                }
                pagination={
                    <ListPagination
                        summary={label('TOTAL', { total: formatNumber(pagination.total) })}
                        current={pagination.current}
                        last={Math.max(1, pagination.last)}
                        hrefFor={page => pageHref(filters, page)}
                        labels={{
                            previous: t('ADMIN_OPERATIONS.COMMON.PREVIOUS'),
                            next: t('ADMIN_OPERATIONS.COMMON.NEXT'),
                            navigation: t('ADMIN_OPERATIONS.COMMON.PAGE', { page: pagination.current }),
                        }}
                    />
                }
            />
        </div>
    );
}
