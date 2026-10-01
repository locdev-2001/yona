import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, EyeOffIcon, ListFilterIcon, LockIcon, TableIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Badge } from '@admin/components/ui/badge';
import { Button } from '@admin/components/ui/button';
import { Card } from '@admin/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@admin/components/ui/tooltip';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import FilterInput from '@admin/views/datatables/filters/filter-input';
import { ListPagination } from '@admin/views/datatables/list/list-pagination';
import DataTablePinnableColumns from '@admin/views/datatables/pinnable-columns/pinnable-columns-datatable';
import StatusBadge from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
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

type Row = Record<string, unknown>;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.DATA.${key}`, params);

const maskedLabel = (masked: DataColumn['masked']) => label(masked === 'personal' ? 'MASKED_PERSONAL' : 'MASKED_SECRET');

// Tham số truy vấn của trang bảng: filter[cột]=giá trị, sort, direction, page.
export function tableQuery(state: { filters: Record<string, string>; sort: string; direction: string; page?: number }): Record<string, string> {
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

// Ô giữ một dòng; nội dung đầy đủ (hoặc lý do bị che) hiện ở tooltip.
export function CellValue({ table, column, value }: { table: string; column: DataColumn; value: unknown }) {
    if (value === null || value === undefined) return <span className="text-muted-foreground">∅</span>;

    if (column.masked) {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={<span className="text-muted-foreground inline-flex items-center gap-1" aria-label={maskedLabel(column.masked)} />}
                >
                    <EyeOffIcon className="size-3.5" />
                    {String(value)}
                </TooltipTrigger>
                <TooltipContent>{maskedLabel(column.masked)}</TooltipContent>
            </Tooltip>
        );
    }

    if (typeof value === 'boolean') return <StatusBadge tone={value ? 'success' : 'neutral'}>{String(value)}</StatusBadge>;

    const link = accountLink(table, column.name, value);
    if (link) {
        return (
            <Link href={link} className="font-medium hover:underline">
                {String(value)}
            </Link>
        );
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

    return (
        <Tooltip>
            <TooltipTrigger render={<span className="block max-w-60 truncate" />}>{text}</TooltipTrigger>
            <TooltipContent className="max-h-60 overflow-hidden break-all">{text}</TooltipContent>
        </Tooltip>
    );
}

export default function DataTable({ table, columns, rows, page, hasMore, sort, direction, filters }: Props) {
    const [draft, setDraft] = useState<Record<string, string>>(filters);
    const [showFilters, setShowFilters] = useState(Object.keys(filters).length > 0);
    const filterable = columns.filter(column => column.filterable);
    const filterCount = Object.keys(filters).length;
    const pageUrl = `/admin/data/${table}`;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        visitWithParams(pageUrl, tableQuery({ filters: draft, sort, direction }));
    };

    const tableColumns = useMemo<ColumnDef<Row>[]>(() => {
        const sortHref = (column: string) =>
            hrefWith(table, tableQuery({ filters, sort: column, direction: sort === column && direction === 'desc' ? 'asc' : 'desc' }));

        return columns.map(column => ({
            id: column.name,
            accessorFn: row => row[column.name],
            header: () =>
                column.sortable ? (
                    <Link
                        href={sortHref(column.name)}
                        preserveScroll
                        aria-label={label('SORT', { column: column.name })}
                        className="hover:text-foreground inline-flex items-center gap-1"
                    >
                        {column.name}
                        {sort === column.name ? (
                            direction === 'asc' ? (
                                <ArrowUpIcon className="size-3.5 opacity-60" aria-hidden="true" />
                            ) : (
                                <ArrowDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
                            )
                        ) : null}
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-1">
                        {column.name}
                        {column.masked ? <EyeOffIcon className="size-3.5 opacity-60" aria-label={maskedLabel(column.masked)} /> : null}
                    </span>
                ),
            cell: ({ row }) => <CellValue table={table} column={column} value={row.original[column.name]} />,
            meta: { cellClassName: 'max-w-60' },
        }));
    }, [columns, table, filters, sort, direction]);

    const pinLabels = {
        stickLeft: label('PIN.LEFT'),
        stickRight: label('PIN.RIGHT'),
        unpin: (column: string) => label('PIN.UNPIN', { column }),
        options: (column: string) => label('PIN.OPTIONS', { column }),
    };

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader
                className="mb-0 md:mb-0"
                eyebrow={
                    <Link href="/admin/data" className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm">
                        <ArrowLeftIcon className="size-3.5" />
                        {label('BACK')}
                    </Link>
                }
                title={label('TABLE_TITLE', { table })}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                            <LockIcon />
                            {label('READ_ONLY')}
                        </Badge>
                        {label('ROWS_ON_PAGE', { count: rows.length })}
                        {/* Bảng rộng hơn khung: nói trước là còn cột ở bên phải. */}
                        {columns.length > 6 ? <span>· {label('SCROLL_HINT', { count: columns.length })}</span> : null}
                    </span>
                }
                actions={
                    <Button variant="outline" aria-expanded={showFilters} onClick={() => setShowFilters(open => !open)}>
                        <ListFilterIcon />
                        {label('FILTERS')}
                        {filterCount > 0 ? <Badge>{filterCount}</Badge> : null}
                    </Button>
                }
            />

            <Card className="gap-0 py-0">
                {showFilters ? (
                    <form onSubmit={submit} className="flex flex-col gap-4 border-b p-6">
                        <p className="text-muted-foreground text-sm">{label('FILTER_HINT')}</p>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            {filterable.map(column => (
                                <FilterInput
                                    key={column.name}
                                    id={`filter-${column.name}`}
                                    label={column.name}
                                    labelClassName="font-mono"
                                    value={draft[column.name] ?? ''}
                                    onChange={value => setDraft(current => ({ ...current, [column.name]: value }))}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">
                                <ListFilterIcon />
                                {t('ADMIN_OPERATIONS.COMMON.APPLY')}
                            </Button>
                            {filterCount > 0 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setDraft({});
                                        visitWithParams(pageUrl, tableQuery({ filters: {}, sort, direction }));
                                    }}
                                >
                                    <XIcon />
                                    {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                                </Button>
                            ) : null}
                        </div>
                    </form>
                ) : null}

                <div className="border-b">
                    <DataTablePinnableColumns
                        data={rows}
                        columns={tableColumns}
                        getRowId={(row, index) => String(row.id ?? index)}
                        initialPinning={columns.some(column => column.name === 'id') ? { left: ['id'] } : {}}
                        labels={pinLabels}
                        className="font-mono text-xs"
                        empty={<DataTableEmpty icon={<TableIcon className="size-4" />} title={label('EMPTY')} />}
                    />
                </div>

                <ListPagination
                    summary={t('ADMIN_OPERATIONS.COMMON.PAGE', { page })}
                    current={page}
                    hasMore={hasMore}
                    hrefFor={target => hrefWith(table, tableQuery({ filters, sort, direction, page: target }))}
                    labels={{
                        previous: t('ADMIN_OPERATIONS.COMMON.PREVIOUS'),
                        next: t('ADMIN_OPERATIONS.COMMON.NEXT'),
                        navigation: t('ADMIN_OPERATIONS.COMMON.PAGE', { page }),
                    }}
                />
            </Card>
        </div>
    );
}
