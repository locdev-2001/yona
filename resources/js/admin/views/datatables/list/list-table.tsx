import { useMemo, type ReactNode } from 'react';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTableGrid } from '../../../../superadmin/design-preview/data-table';
import { dimensionTokens } from '../../../../superadmin/design-preview/tokens';
import '@admin/views/datatables/column-meta';
import '../../../../superadmin/resource/resources.css';
export interface ListTableProps<TRecord> {
    data: TRecord[];
    columns: ColumnDef<TRecord, any>[];
    getRowId: (row: TRecord) => string;
    empty: ReactNode;
    expandedRowId?: string | null;
    renderExpanded?: (row: TRecord) => ReactNode;
}
export function ListTable<TRecord>({ data, columns, getRowId, empty, expandedRowId, renderExpanded }: ListTableProps<TRecord>) {
    const sizedColumns = useMemo(() => columns.map((column, index) => ({
        ...column,
        size: column.size ?? Number.parseFloat(dimensionTokens[index === 0 ? 'table-person-width' : column.meta?.numeric ? 'table-id-width' : 'table-date-width']),
    })), [columns]);
    const table = useReactTable({ data, columns: sizedColumns, manualPagination: true, manualFiltering: true, manualSorting: true, getCoreRowModel: getCoreRowModel(), getRowId, enableRowSelection: false });
    return <div className="preview-data-table console-operation-table"><DataTableGrid table={table} empty={empty} expandedRowId={expandedRowId} renderExpanded={renderExpanded} /></div>;
}
