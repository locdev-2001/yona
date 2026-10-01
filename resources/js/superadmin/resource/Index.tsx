import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';

import FieldValue from '../components/FieldValue';
import { useNavLabel } from '../components/navigation';
import type { SuperAdminColumn, SuperAdminRow } from '../types';
import { Button, buttonClassName } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';
import { ConfirmDialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { Input, Select } from '../ui/Input';
import { useConsoleDictionary, useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';

type Props = {
    resource: string;
    resourceLabel: string;
    singular: string;
    singularLabel: string;
    columns: SuperAdminColumn[];
    rows: SuperAdminRow[];
    pagination: { current: number; last: number; total: number };
    filters: string[];
    search: string;
    order: string;
    direction: string;
    actions: string[];
};

const DEFAULT_ORDER = 'id';
const DEFAULT_DIRECTION = 'desc';
const LINKED_CELL_TYPES = ['belongs_to', 'belongs_to_search', 'polymorphic', 'secret_field'];

// Bộ lọc và ô tìm kiếm dùng chung tham số `search`: `<tên bộ lọc>:` là lọc, còn
// lại là từ khoá.
export function activeFilter(search: string, filters: string[]): string {
    const name = search.endsWith(':') ? search.slice(0, -1) : '';

    return filters.includes(name) ? name : '';
}

export function indexUrl(
    resource: string,
    singular: string,
    params: { search?: string; order?: string; direction?: string; page?: number },
): string {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if ((params.order && params.order !== DEFAULT_ORDER) || (params.direction && params.direction !== DEFAULT_DIRECTION)) {
        query.set(`${singular}[order]`, params.order ?? DEFAULT_ORDER);
        query.set(`${singular}[direction]`, params.direction ?? DEFAULT_DIRECTION);
    }
    if (params.page && params.page > 1) query.set('page', String(params.page));
    const queryString = query.toString();

    return `/admin/${resource}${queryString ? `?${queryString}` : ''}`;
}

// Bảng CRUD chung cho mọi tài nguyên của console: tìm kiếm, bộ lọc, sắp xếp cột,
// phân trang giữ nguyên điều kiện đang xem.
export default function ResourceIndex({
    resource,
    resourceLabel,
    singular,
    columns,
    rows,
    pagination,
    filters,
    search,
    order,
    direction,
    actions,
}: Props) {
    const label = useConsoleLabels();
    const dictionary = useConsoleDictionary();
    const title = useNavLabel(`/admin/${resource}`, resourceLabel);
    const filter = activeFilter(search, filters);
    const keyword = filter ? '' : search;
    const [query, setQuery] = useState(keyword);
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);
    const canEdit = actions.includes('edit');
    const canDestroy = actions.includes('destroy');

    const visit = (params: { search?: string; order?: string; direction?: string; page?: number }) =>
        router.get(indexUrl(resource, singular, { order, direction, ...params }), {}, { preserveState: true, preserveScroll: true });

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        visit({ search: query.trim() });
    };

    const sortHref = (column: string) =>
        indexUrl(resource, singular, {
            search,
            order: column,
            direction: order === column && direction === 'asc' ? 'desc' : 'asc',
        });

    const openRow = (event: MouseEvent<HTMLTableRowElement>, url: string | null) => {
        if (!url || (event.target as HTMLElement).closest('a, button, input, select, textarea')) return;
        router.visit(url);
    };

    return (
        <>
            <PageHeader
                title={title}
                description={label('records_total', { total: pagination.total.toLocaleString('vi-VN') })}
                actions={
                    actions.includes('new') ? (
                        <Link href={`/admin/${resource}/new`} className={buttonClassName()}>
                            <Icon name="i-lucide-plus" />
                            {label('new_record')}
                        </Link>
                    ) : null
                }
            />

            <Card className="gap-0 py-0">
                <div className="flex flex-col gap-2 border-b border-console-border p-3 sm:flex-row sm:items-center">
                    <form role="search" onSubmit={submitSearch} className="relative w-full sm:max-w-sm">
                        <Icon
                            name="i-lucide-search"
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-console-muted-foreground"
                        />
                        <Input
                            type="search"
                            name="search"
                            aria-label={label('search_records', { resource: title.toLowerCase() })}
                            placeholder={label('search_records', { resource: title.toLowerCase() })}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            className="pl-8 pr-8"
                        />
                        {keyword ? (
                            <button
                                type="button"
                                aria-label={label('clear_search')}
                                className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-console-muted-foreground hover:text-console-foreground"
                                onClick={() => {
                                    setQuery('');
                                    visit({ search: '' });
                                }}
                            >
                                <Icon name="i-lucide-x" className="size-3.5" />
                            </button>
                        ) : null}
                    </form>

                    {filters.length > 0 ? (
                        <div className="flex items-center gap-2 sm:ml-auto sm:w-56">
                            <Icon name="i-lucide-filter" className="shrink-0 text-console-muted-foreground" />
                            <Select
                                aria-label={label('filter')}
                                value={filter}
                                onChange={event => {
                                    setQuery('');
                                    visit({ search: event.target.value ? `${event.target.value}:` : '' });
                                }}
                            >
                                <option value="">{label('filter_all')}</option>
                                {filters.map(name => (
                                    <option value={name} key={name}>
                                        {dictionary.filter(name)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    ) : null}
                </div>

                {rows.length === 0 ? (
                    <EmptyState
                        title={label('no_records')}
                        description={search ? label('no_records_hint') : undefined}
                        action={
                            search ? (
                                <Link href={`/admin/${resource}`} className={buttonClassName({ variant: 'outline', size: 'sm' })}>
                                    {label('clear_search')}
                                </Link>
                            ) : null
                        }
                    />
                ) : (
                    <Table aria-label={title}>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {columns.map(column => {
                                    const sorted = order === column.name;
                                    const columnLabel = dictionary.attribute(column.name, column.label);

                                    return (
                                        <TableHead
                                            key={column.name}
                                            scope="col"
                                            aria-sort={sorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                                            className={cn(column.html_class === 'number' && 'text-right')}
                                        >
                                            <Link
                                                href={sortHref(column.name)}
                                                preserveScroll
                                                title={label('sort_by', { column: columnLabel })}
                                                className={cn(
                                                    'inline-flex items-center gap-1 hover:text-console-foreground',
                                                    sorted && 'text-console-foreground',
                                                )}
                                            >
                                                {columnLabel}
                                                <Icon
                                                    name={
                                                        sorted
                                                            ? direction === 'asc'
                                                                ? 'i-lucide-arrow-up'
                                                                : 'i-lucide-arrow-down'
                                                            : 'i-lucide-arrow-up-down'
                                                    }
                                                    className={cn('size-3', !sorted && 'opacity-40')}
                                                />
                                            </Link>
                                        </TableHead>
                                    );
                                })}
                                {canEdit || canDestroy ? (
                                    <TableHead scope="col" className="text-right">
                                        <span className="sr-only">{label('actions')}</span>
                                    </TableHead>
                                ) : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, rowIndex) => (
                                <TableRow
                                    key={row.url ?? rowIndex}
                                    className={cn(row.url && 'cursor-pointer')}
                                    onClick={event => openRow(event, row.url)}
                                >
                                    {row.cells.map((cell, cellIndex) => (
                                        <TableCell
                                            key={cell.name}
                                            className={cn(
                                                'max-w-xs',
                                                cell.name === 'name' && 'min-w-44',
                                                cell.html_class === 'number' && 'text-right',
                                            )}
                                        >
                                            {cellIndex === 0 && row.url && !LINKED_CELL_TYPES.includes(cell.type) ? (
                                                <Link href={row.url} className="font-medium text-console-foreground hover:underline">
                                                    <FieldValue field={cell} nested />
                                                </Link>
                                            ) : (
                                                <FieldValue field={cell} nested />
                                            )}
                                        </TableCell>
                                    ))}
                                    {canEdit || canDestroy ? (
                                        <TableCell className="whitespace-nowrap text-right">
                                            <div className="inline-flex items-center gap-1">
                                                {canEdit && row.url ? (
                                                    <Link
                                                        href={`${row.url}/edit`}
                                                        aria-label={label('edit')}
                                                        title={label('edit')}
                                                        className={buttonClassName({ variant: 'ghost', size: 'icon-sm' })}
                                                    >
                                                        <Icon name="i-lucide-pencil" />
                                                    </Link>
                                                ) : null}
                                                {canDestroy && row.url ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        aria-label={label('delete')}
                                                        title={label('delete')}
                                                        onClick={() => setPendingDelete(row.url)}
                                                    >
                                                        <Icon name="i-lucide-trash-2" className="text-console-destructive-foreground" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    ) : null}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {pagination.last > 1 ? (
                    <div className="border-t border-console-border px-3 py-3">
                        <Pagination
                            current={pagination.current}
                            last={pagination.last}
                            hrefFor={page => indexUrl(resource, singular, { search, order, direction, page })}
                        />
                    </div>
                ) : null}
            </Card>

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={open => {
                    if (!open) setPendingDelete(null);
                }}
                title={label('delete_confirm_title')}
                description={label('delete_confirm_description')}
                confirmLabel={label('delete')}
                onConfirm={() => {
                    if (pendingDelete) router.delete(pendingDelete, { preserveScroll: true });
                    setPendingDelete(null);
                }}
            />
        </>
    );
}
