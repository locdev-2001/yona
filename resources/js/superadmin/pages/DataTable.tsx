import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../i18n';
import { Badge } from '../ui/Badge';
import { Button, buttonClassName } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Input, Label } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { visitWithParams } from './operationsFormat';

export type DataColumn = {
    name: string;
    type: string;
    masked: 'secret' | 'personal' | null;
    filterable: boolean;
    sortable: boolean;
};

type Props = {
    table: string;
    columns: DataColumn[];
    rows: Record<string, unknown>[];
    page: number;
    hasMore: boolean;
    sort: string;
    direction: 'asc' | 'desc';
    filters: Record<string, string>;
    perPage: number;
};

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.DATA.${key}`, params);

// Tham số truy vấn của trang bảng: filter[cột]=giá trị, sort, direction, page.
export function tableQuery(
    state: { filters: Record<string, string>; sort: string; direction: string; page?: number },
): Record<string, string> {
    const query: Record<string, string> = { sort: state.sort, direction: state.direction };
    Object.entries(state.filters).forEach(([column, value]) => {
        if (value.trim() !== '') query[`filter[${column}]`] = value.trim();
    });
    if (state.page && state.page > 1) query.page = String(state.page);

    return query;
}

function hrefWith(table: string, query: Record<string, string>): string {
    return `/admin/data/${table}?${new URLSearchParams(query).toString()}`;
}

// Khoá ngoại tới account mở thẳng account 360; id của chính bảng accounts cũng vậy.
function accountLink(table: string, column: string, value: unknown): string | null {
    if (typeof value !== 'number') return null;
    if (column === 'account_id' || (table === 'accounts' && column === 'id')) return `/admin/accounts/${value}/overview`;

    return null;
}

export function CellValue({ table, column, value }: { table: string; column: DataColumn; value: unknown }) {
    if (value === null || value === undefined) return <span className="text-console-muted-foreground">∅</span>;

    if (column.masked) {
        return (
            <span
                className="inline-flex items-center gap-1 text-console-muted-foreground"
                title={label(column.masked === 'personal' ? 'MASKED_PERSONAL' : 'MASKED_SECRET')}
            >
                <Icon name="i-lucide-eye-off" className="size-3.5" />
                {String(value)}
            </span>
        );
    }

    if (typeof value === 'boolean') return <Badge variant={value ? 'success' : 'secondary'}>{String(value)}</Badge>;

    const link = accountLink(table, column.name, value);
    if (link) {
        return (
            <Link href={link} className="text-console-brand hover:underline">
                {String(value)}
            </Link>
        );
    }

    return <span className="break-words">{String(value)}</span>;
}

export default function DataTable({ table, columns, rows, page, hasMore, sort, direction, filters }: Props) {
    const [draft, setDraft] = useState<Record<string, string>>(filters);
    const [showFilters, setShowFilters] = useState(Object.keys(filters).length > 0);
    const filterable = columns.filter(column => column.filterable);
    const hasFilters = Object.keys(filters).length > 0;
    const pageUrl = `/admin/data/${table}`;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        visitWithParams(pageUrl, tableQuery({ filters: draft, sort, direction }));
    };

    const sortHref = (column: string) =>
        hrefWith(table, tableQuery({ filters, sort: column, direction: sort === column && direction === 'desc' ? 'asc' : 'desc' }));

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Link href="/admin/data" className="inline-flex w-fit items-center gap-1 text-sm text-console-muted-foreground hover:text-console-foreground">
                    <Icon name="i-lucide-arrow-left" className="size-3.5" />
                    {label('BACK')}
                </Link>
                <PageHeader
                    title={table}
                    description={
                        <span className="flex items-center gap-2">
                            <Badge variant="outline">
                                <Icon name="i-lucide-lock" className="size-3" />
                                {label('READ_ONLY')}
                            </Badge>
                            {label('ROWS_ON_PAGE', { count: rows.length })}
                        </span>
                    }
                    actions={
                        <Button variant="outline" aria-expanded={showFilters} onClick={() => setShowFilters(open => !open)}>
                            <Icon name="i-lucide-list-filter" />
                            {label('FILTERS')}
                            {hasFilters ? <Badge variant="default">{Object.keys(filters).length}</Badge> : null}
                        </Button>
                    }
                />
            </div>

            <Card className="gap-0 py-0">
                {showFilters ? (
                    <form onSubmit={submit} className="flex flex-col gap-3 border-b border-console-border p-4">
                        <p className="text-xs text-console-muted-foreground">{label('FILTER_HINT')}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {filterable.map(column => (
                                <div key={column.name} className="flex flex-col gap-1.5">
                                    <Label htmlFor={`filter-${column.name}`} className="font-mono text-xs">
                                        {column.name}
                                    </Label>
                                    <Input
                                        id={`filter-${column.name}`}
                                        value={draft[column.name] ?? ''}
                                        onChange={event => setDraft(current => ({ ...current, [column.name]: event.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">{t('ADMIN_OPERATIONS.COMMON.APPLY')}</Button>
                            {hasFilters ? (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setDraft({});
                                        visitWithParams(pageUrl, tableQuery({ filters: {}, sort, direction }));
                                    }}
                                >
                                    {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                                </Button>
                            ) : null}
                        </div>
                    </form>
                ) : null}

                {rows.length === 0 ? (
                    <EmptyState icon="i-lucide-table" title={label('EMPTY')} />
                ) : (
                    <Table className="font-mono text-xs">
                        <TableHeader>
                            <TableRow>
                                {columns.map(column => (
                                    <TableHead key={column.name} className="normal-case tracking-normal">
                                        {column.sortable ? (
                                            <Link
                                                href={sortHref(column.name)}
                                                preserveScroll
                                                aria-label={label('SORT', { column: column.name })}
                                                className="inline-flex items-center gap-1 hover:text-console-foreground"
                                            >
                                                {column.name}
                                                {sort === column.name ? (
                                                    <Icon name={direction === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'} className="size-3" />
                                                ) : null}
                                            </Link>
                                        ) : (
                                            <span
                                                className="inline-flex items-center gap-1"
                                                title={column.masked ? label(column.masked === 'personal' ? 'MASKED_PERSONAL' : 'MASKED_SECRET') : undefined}
                                            >
                                                {column.name}
                                                {column.masked ? <Icon name="i-lucide-eye-off" className="size-3" /> : null}
                                            </span>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, index) => (
                                <TableRow key={String(row.id ?? index)}>
                                    {columns.map(column => (
                                        <TableCell key={column.name} className="max-w-xs align-top">
                                            <CellValue table={table} column={column} value={row[column.name]} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <nav aria-label={t('ADMIN_OPERATIONS.COMMON.PAGE', { page })} className="flex items-center justify-between gap-3">
                <span className="text-sm text-console-muted-foreground">{t('ADMIN_OPERATIONS.COMMON.PAGE', { page })}</span>
                <div className="flex gap-2">
                    <Link
                        href={hrefWith(table, tableQuery({ filters, sort, direction, page: page - 1 }))}
                        className={cn(buttonClassName({ variant: 'outline', size: 'sm' }), page <= 1 && 'pointer-events-none opacity-50')}
                        aria-disabled={page <= 1}
                        preserveScroll
                    >
                        <Icon name="i-lucide-chevron-left" />
                        {t('ADMIN_OPERATIONS.COMMON.PREVIOUS')}
                    </Link>
                    <Link
                        href={hrefWith(table, tableQuery({ filters, sort, direction, page: page + 1 }))}
                        className={cn(buttonClassName({ variant: 'outline', size: 'sm' }), !hasMore && 'pointer-events-none opacity-50')}
                        aria-disabled={!hasMore}
                        preserveScroll
                    >
                        {t('ADMIN_OPERATIONS.COMMON.NEXT')}
                        <Icon name="i-lucide-chevron-right" />
                    </Link>
                </div>
            </nav>
        </div>
    );
}
