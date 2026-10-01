import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import Link from '@admin/components/Link';
import { Button } from '@admin/components/ui/button';
import { ConfirmDialog } from '@admin/views/apps/resources/dialogs/confirm-dialog';
import ResourceListApp from '@admin/views/apps/resources/list';
import { ResourcePagination } from '@admin/views/apps/resources/list/resource-pagination';
import { ResourceTable } from '@admin/views/apps/resources/list/resource-table';
import { buildResourceColumns } from '@admin/views/apps/resources/list/resource-table-columns';
import { ResourceTableFilters } from '@admin/views/apps/resources/list/resource-table-filters';
import { ResourceTableToolbar } from '@admin/views/apps/resources/list/resource-table-toolbar';

import FieldValue from '../components/FieldValue';
import { useNavLabel } from '../components/navigation';
import { useConsoleDictionary, useConsoleLabels } from '../labels';
import type { SuperAdminColumn, SuperAdminField, SuperAdminRow } from '../types';

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
// Khớp ResourceController::PER_PAGE.
const PER_PAGE = 20;

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
// phân trang giữ nguyên điều kiện đang xem; tài khoản có lối tắt Tổng quan 360.
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
    const showingFrom = (pagination.current - 1) * PER_PAGE + 1;
    const searchLabel = label('search_records', { resource: title.toLowerCase() });

    const visit = (params: { search?: string; order?: string; direction?: string; page?: number }) =>
        router.get(indexUrl(resource, singular, { order, direction, ...params }), {}, { preserveState: true, preserveScroll: true });

    const tableColumns = useMemo(
        () =>
            buildResourceColumns({
                columns,
                columnLabel: column => dictionary.attribute(column.name, column.label),
                canEdit,
                canDestroy,
                withOverview: resource === 'accounts',
                labels: {
                    view: label('view'),
                    edit: label('edit'),
                    delete: label('delete'),
                    actions: label('actions'),
                    overview: label('account_overview'),
                },
                onDelete: setPendingDelete,
                renderCell: cell => <FieldValue field={cell as SuperAdminField} nested />,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [columns, canEdit, canDestroy, resource],
    );

    const sort = (column: string) =>
        visit({ search, order: column, direction: order === column && direction === 'asc' ? 'desc' : 'asc' });

    return (
        <>
            <ResourceListApp
                title={title}
                description={label('records_total', { total: pagination.total.toLocaleString('vi-VN') })}
                filters={
                    filters.length > 0 ? (
                        <ResourceTableFilters
                            label={label('filter')}
                            allLabel={label('filter_all')}
                            value={filter}
                            options={filters.map(name => ({ value: name, label: dictionary.filter(name) }))}
                            onFilterChange={next => {
                                setQuery('');
                                visit({ search: next ? `${next}:` : '' });
                            }}
                        />
                    ) : null
                }
                toolbar={
                    <ResourceTableToolbar
                        search={query}
                        searchLabel={searchLabel}
                        clearLabel={label('clear_search')}
                        canClear={keyword !== ''}
                        newRecord={actions.includes('new') ? { href: `/admin/${resource}/new`, label: label('new_record') } : null}
                        onSearchChange={setQuery}
                        onSubmit={() => visit({ search: query.trim() })}
                        onClear={() => {
                            setQuery('');
                            visit({ search: '' });
                        }}
                    />
                }
                table={
                    rows.length === 0 ? (
                        <div className='flex flex-col items-center gap-2 border-t px-6 py-12 text-center'>
                            <p className='text-base font-medium'>{label('no_records')}</p>
                            {search ? <p className='text-muted-foreground text-sm'>{label('no_records_hint')}</p> : null}
                            {search ? (
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='mt-2'
                                    render={<Link href={`/admin/${resource}`} />}
                                    nativeButton={false}
                                >
                                    {label('clear_search')}
                                </Button>
                            ) : null}
                        </div>
                    ) : (
                        <ResourceTable
                            label={title}
                            rows={rows}
                            columns={tableColumns}
                            totalPages={pagination.last}
                            sorting={columns.some(column => column.name === order) ? { id: order, desc: direction === 'desc' } : null}
                            sortTitle={column => label('sort_by', { column })}
                            onSort={sort}
                            onOpenRow={url => router.visit(url)}
                        />
                    )
                }
                pagination={
                    rows.length > 0 ? (
                        <ResourcePagination
                            summary={`${showingFrom.toLocaleString('vi-VN')}–${(showingFrom + rows.length - 1).toLocaleString('vi-VN')} / ${label('records_total', { total: pagination.total.toLocaleString('vi-VN') })}`}
                            currentPage={pagination.current}
                            totalPages={pagination.last}
                            hrefFor={page => indexUrl(resource, singular, { search, order, direction, page })}
                            previousLabel={label('previous_page')}
                            nextLabel={label('next_page')}
                        />
                    ) : null
                }
            />

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={open => {
                    if (!open) setPendingDelete(null);
                }}
                title={label('delete_confirm_title')}
                description={label('delete_confirm_description')}
                cancelLabel={label('cancel')}
                confirmLabel={label('delete')}
                onConfirm={() => {
                    if (pendingDelete) router.delete(pendingDelete, { preserveScroll: true });
                    setPendingDelete(null);
                }}
            />
        </>
    );
}
