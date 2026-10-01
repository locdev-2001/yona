import { Link } from '@inertiajs/react';
import { Fragment, useId, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../i18n';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Input, Label, Select } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
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

function statusVariant(status: number | null): 'success' | 'warning' | 'destructive' | 'secondary' {
    if (status === null) return 'secondary';
    if (status >= 500) return 'destructive';
    if (status >= 400) return 'warning';

    return 'success';
}

export function pageHref(filters: Filters, page: number): string {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][]);
    if (page > 1) query.set('page', String(page));
    const search = query.toString();

    return search ? `${PAGE_URL}?${search}` : PAGE_URL;
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

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} />

            <Card className="gap-0 py-0">
                <form onSubmit={submit} className="grid grid-cols-1 gap-3 border-b border-console-border p-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.admin}>{label('FILTERS.ADMIN')}</Label>
                        <Select id={ids.admin} value={draft.super_admin_id ?? ''} onChange={event => set('super_admin_id', event.target.value)}>
                            <option value="">{label('FILTERS.ALL_ADMINS')}</option>
                            {options.superAdmins.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.action}>{label('COLUMNS.ACTION')}</Label>
                        <Input id={ids.action} value={draft.action ?? ''} placeholder={label('FILTERS.ACTION')} onChange={event => set('action', event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.subjectType}>{label('FILTERS.SUBJECT_TYPE')}</Label>
                        <Select id={ids.subjectType} value={draft.subject_type ?? ''} onChange={event => set('subject_type', event.target.value)}>
                            <option value="">{label('FILTERS.ALL_SUBJECTS')}</option>
                            {options.subjectTypes.map(type => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.subjectId}>{label('FILTERS.SUBJECT_ID')}</Label>
                        <Input id={ids.subjectId} inputMode="numeric" value={draft.subject_id ?? ''} onChange={event => set('subject_id', event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.from}>{label('FILTERS.FROM')}</Label>
                        <Input id={ids.from} type="date" value={draft.from ?? ''} onChange={event => set('from', event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={ids.to}>{label('FILTERS.TO')}</Label>
                        <Input id={ids.to} type="date" value={draft.to ?? ''} onChange={event => set('to', event.target.value)} />
                    </div>
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
                        <Button type="submit">{t('ADMIN_OPERATIONS.COMMON.APPLY')}</Button>
                        {hasFilters ? (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setDraft({});
                                    visitWithParams(PAGE_URL, {});
                                }}
                            >
                                {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                            </Button>
                        ) : null}
                    </div>
                </form>

                {logs.length === 0 ? (
                    <EmptyState icon="i-lucide-scroll-text" title={label('EMPTY_TITLE')} description={label('EMPTY_DESCRIPTION')} />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{label('COLUMNS.TIME')}</TableHead>
                                <TableHead>{label('COLUMNS.ADMIN')}</TableHead>
                                <TableHead>{label('COLUMNS.ACTION')}</TableHead>
                                <TableHead>{label('COLUMNS.SUBJECT')}</TableHead>
                                <TableHead>{label('COLUMNS.STATUS')}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{label('PAYLOAD')}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map(log => (
                                <Fragment key={log.id}>
                                    <TableRow>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                                        <TableCell className="break-all">
                                            {log.superAdminEmail ?? label('DELETED_ADMIN')}
                                            {log.ipAddress ? <p className="text-xs text-console-muted-foreground">{log.ipAddress}</p> : null}
                                        </TableCell>
                                        <TableCell>
                                            <code className="break-all rounded bg-console-muted px-1.5 py-0.5 text-xs">{log.action}</code>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {log.subjectType ? (
                                                log.subjectUrl ? (
                                                    <Link href={log.subjectUrl} className="text-console-brand hover:underline">
                                                        {log.subjectType} #{log.subjectId}
                                                    </Link>
                                                ) : (
                                                    <span>
                                                        {log.subjectType}
                                                        {log.subjectId ? ` #${log.subjectId}` : ''}
                                                    </span>
                                                )
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(log.responseStatus)}>{log.responseStatus ?? '—'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-expanded={expanded === log.id}
                                                aria-label={label('PAYLOAD')}
                                                onClick={() => setExpanded(current => (current === log.id ? null : log.id))}
                                            >
                                                <Icon name={expanded === log.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {expanded === log.id ? (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={6}>
                                                {log.changes ? (
                                                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-console-muted p-3 text-xs">
                                                        {JSON.stringify(log.changes, null, 2)}
                                                    </pre>
                                                ) : (
                                                    <p className="text-console-muted-foreground">{label('NO_PAYLOAD')}</p>
                                                )}
                                                {log.userAgent ? <p className="mt-2 break-all text-xs text-console-muted-foreground">{log.userAgent}</p> : null}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <Pagination
                current={pagination.current}
                last={pagination.last}
                summary={label('TOTAL', { total: formatNumber(pagination.total) })}
                hrefFor={page => pageHref(filters, page)}
            />
        </div>
    );
}
