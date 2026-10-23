import type { ReactNode } from 'react';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTableGrid } from '../../../../superadmin/design-preview/data-table';
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
    const table = useReactTable({ data, columns, manualPagination: true, manualFiltering: true, manualSorting: true, getCoreRowModel: getCoreRowModel(), getRowId, enableRowSelection: false });
    return <div className="preview-data-table console-operation-table"><DataTableGrid table={table} empty={empty} expandedRowId={expandedRowId} renderExpanded={renderExpanded} /></div>;
}
