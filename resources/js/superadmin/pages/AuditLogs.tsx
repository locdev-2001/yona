import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, ScrollTextIcon, XIcon } from '@admin/components/icons';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@admin/components/ui/button';
import { Input } from '@admin/components/ui/input';
import { Label } from '@admin/components/ui/label';
import { EMPTY_VALUE, formatDateTime } from '@admin/lib/format';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import DateInput from '@admin/views/datatables/filters/date-input';
import type { DateInputLabels } from '@admin/views/datatables/filters/date-input';
import ListCard from '@admin/views/datatables/list';
import { FilterSelect } from '@admin/views/datatables/list/list-filters';
import { ListPagination } from '@admin/views/datatables/list/list-pagination';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { ListToolbar } from '@admin/views/datatables/list/list-toolbar';
import StatusBadge from '@admin/views/datatables/status-badge';
import type { StatusTone } from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatNumber, visitWithParams } from './operationsFormat';

type AuditLog = {
    id: number;
    superAdminId: number | null;
    superAdminEmail: string | null;
    action: string;
    // Câu mô tả tiếng Việt do máy chủ dựng; route thô ở `action`.
    actionLabel?: string;
    subjectType: string | null;
    subjectLabel?: string | null;
    subjectId: number | null;
    subjectUrl: string | null;
    changes: Record<string, unknown> | null;
    responseStatus: number | null;
    statusLabel?: string | null;
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
    options: { superAdmins: { value: string; label: string }[]; subjectTypes: string[]; subjectTypeLabels?: Record<string, string> };
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
    if (!log.subjectType) return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
    const text = log.subjectLabel ?? `${log.subjectType}${log.subjectId ? ` #${log.subjectId}` : ''}`;

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
            <dl className="text-muted-foreground grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
                <dt>{label('RAW_ACTION')}</dt>
                <dd className="font-mono break-all">{log.action}</dd>
                {log.responseStatus !== null ? (
                    <>
                        <dt>{label('HTTP_STATUS')}</dt>
                        <dd className="font-num">{log.responseStatus}</dd>
                    </>
                ) : null}
                {log.ipAddress ? (
                    <>
                        <dt>{label('IP_ADDRESS')}</dt>
                        <dd className="font-num">{log.ipAddress}</dd>
                    </>
                ) : null}
                {log.userAgent ? (
                    <>
                        <dt>{label('USER_AGENT')}</dt>
                        <dd className="break-all">{log.userAgent}</dd>
                    </>
                ) : null}
            </dl>
        </div>
    );
}

// Một dải lọc trên bảng: ô chọn và ô ngày lọc ngay khi đổi, ô chữ lọc khi nhấn Enter
// (giống Sức khoẻ kênh và bảng tài nguyên, không có nút "Lọc" riêng).
export default function AuditLogs({ logs, pagination, filters, options }: Props) {
    const [draft, setDraft] = useState<Filters>(filters);
    const [expanded, setExpanded] = useState<number | null>(null);
    const ids = { admin: useId(), action: useId(), subjectType: useId(), subjectId: useId(), from: useId(), to: useId() };
    const hasFilters = Object.values(filters).some(Boolean);
    const set = (key: FilterKey, value: string) => setDraft(current => ({ ...current, [key]: value }));
    const apply = (next: Filters) => {
        const merged = { ...draft, ...next };
        setDraft(merged);
        visitWithParams(PAGE_URL, merged);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        visitWithParams(PAGE_URL, draft);
    };
    const dateLabels: DateInputLabels = {
        openCalendar: t('ADMIN_OPERATIONS.COMMON.OPEN_CALENDAR'),
        previousMonth: t('ADMIN_OPERATIONS.COMMON.PREVIOUS_MONTH'),
        nextMonth: t('ADMIN_OPERATIONS.COMMON.NEXT_MONTH'),
        weekdays: t('ADMIN_OPERATIONS.COMMON.WEEKDAYS').split(','),
        month: date => t('ADMIN_OPERATIONS.COMMON.MONTH_YEAR', { month: date.getMonth() + 1, year: date.getFullYear() }),
    };

    const columns: ColumnDef<AuditLog>[] = [
        {
            id: 'time',
            header: () => label('COLUMNS.TIME'),
            cell: ({ row }) => <span className="font-num whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
        },
        {
            id: 'action',
            header: () => label('COLUMNS.ACTION'),
            cell: ({ row }) => (
                <span className="font-medium" title={row.original.action}>
                    {row.original.actionLabel ?? row.original.action}
                </span>
            ),
        },
        {
            id: 'subject',
            header: () => label('COLUMNS.SUBJECT'),
            cell: ({ row }) => <Subject log={row.original} />,
            meta: { cellClassName: 'whitespace-nowrap' },
        },
        {
            id: 'admin',
            header: () => label('COLUMNS.ADMIN'),
            cell: ({ row }) => <span className="break-all">{row.original.superAdminEmail ?? label('DELETED_ADMIN')}</span>,
        },
        {
            id: 'status',
            header: () => label('COLUMNS.STATUS'),
            cell: ({ row }) => (
                <span title={row.original.responseStatus === null ? undefined : String(row.original.responseStatus)}>
                    <StatusBadge tone={statusTone(row.original.responseStatus)}>
                        {row.original.statusLabel ?? row.original.responseStatus ?? EMPTY_VALUE}
                    </StatusBadge>
                </span>
            ),
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
            meta: { headerClassName: 'w-14', cellClassName: 'w-14', mobileRole: 'actions' },
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            <ListCard
                toolbar={
                    <ListToolbar
                        search={{
                            id: ids.action,
                            label: label('COLUMNS.ACTION'),
                            placeholder: label('FILTERS.ACTION'),
                            value: draft.action ?? '',
                            onChange: value => set('action', value),
                            onSubmit: () => visitWithParams(PAGE_URL, draft),
                            onClear: () => visitWithParams(PAGE_URL, { ...draft, action: '' }),
                        }}
                        filters={
                            <>
                                <FilterSelect
                                    inline
                                    id={ids.admin}
                                    label={label('FILTERS.ADMIN')}
                                    allLabel={label('FILTERS.ALL_ADMINS')}
                                    options={options.superAdmins}
                                    value={draft.super_admin_id ?? ''}
                                    onChange={value => apply({ super_admin_id: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.subjectType}
                                    label={label('FILTERS.SUBJECT_TYPE')}
                                    allLabel={label('FILTERS.ALL_SUBJECTS')}
                                    options={options.subjectTypes.map(type => ({ value: type, label: options.subjectTypeLabels?.[type] ?? type }))}
                                    value={draft.subject_type ?? ''}
                                    onChange={value => apply({ subject_type: value })}
                                />
                                <form onSubmit={submit} className="w-full sm:w-28">
                                    <Label htmlFor={ids.subjectId} className="sr-only">
                                        {label('FILTERS.SUBJECT_ID')}
                                    </Label>
                                    <Input
                                        id={ids.subjectId}
                                        inputMode="numeric"
                                        placeholder={label('FILTERS.SUBJECT_ID')}
                                        value={draft.subject_id ?? ''}
                                        onChange={event => set('subject_id', event.target.value)}
                                    />
                                </form>
                                <DateInput
                                    id={ids.from}
                                    label={label('FILTERS.FROM')}
                                    value={draft.from ?? ''}
                                    onChange={value => apply({ from: value })}
                                    labels={dateLabels}
                                    prefix={label('FILTERS.FROM_SHORT')}
                                    className="w-full sm:w-44"
                                />
                                <DateInput
                                    id={ids.to}
                                    label={label('FILTERS.TO')}
                                    value={draft.to ?? ''}
                                    onChange={value => apply({ to: value })}
                                    labels={dateLabels}
                                    prefix={label('FILTERS.TO_SHORT')}
                                    className="w-full sm:w-44"
                                />
                            </>
                        }
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
                    </ListToolbar>
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
