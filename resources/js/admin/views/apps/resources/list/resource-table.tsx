import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCoreRowModel, useReactTable, type ColumnDef, type VisibilityState } from '@tanstack/react-table';
import { Table2 } from '@admin/components/icons';
import { PreviewDataTable, SortableTableHeading } from '../../../../../superadmin/design-preview/data-table';
import { dimensionTokens } from '../../../../../superadmin/design-preview/tokens';
import type { ResourceRow } from './resource-table-columns';

export type ResourceSorting = { id: string; desc: boolean };
type Preferences = { visibility: VisibilityState; order: string[] };
function readPreferences(key: string): Preferences {
    try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
        return { visibility: saved?.visibility ?? {}, order: Array.isArray(saved?.order) ? saved.order : [] };
    } catch { return { visibility: {}, order: [] }; }
}
export interface ResourceTableProps {
    label: string;
    storageKey: string;
    rows: ResourceRow[];
    columns: ColumnDef<ResourceRow>[];
    totalPages: number;
    totalRows: number;
    sorting: ResourceSorting | null;
    onSort: (columnId: string) => void;
    onOpenRow: (url: string) => void;
    search: ReactNode;
    filters: ReactNode;
    pagination: ReactNode;
    empty: ReactNode;
}
export function ResourceTable({ label, storageKey, rows, columns, totalPages, totalRows, sorting, onSort, onOpenRow, search, filters, pagination, empty }: ResourceTableProps) {
    const [preferences, setPreferences] = useState(() => readPreferences(storageKey));
    useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {} }, [storageKey, preferences]);
    const definitions = useMemo(() => columns.map(definition => {
        const id = definition.id!;
        const heading = String(definition.header ?? id);
        return { ...definition,
            size: parseInt(dimensionTokens[id === 'name' ? 'table-person-width' : id === 'actions' ? 'table-id-width' : 'table-date-width']),
            enableHiding: id !== 'name' && id !== 'actions',
            header: definition.enableSorting === false ? heading : ({ column }: Parameters<Exclude<ColumnDef<ResourceRow>['header'], string | undefined>>[0]) => <SortableTableHeading column={column} label={heading} Icon={Table2} />,
        } as ColumnDef<ResourceRow>;
    }), [columns]);
    const table = useReactTable({
        data: rows, columns: definitions, manualPagination: true, manualFiltering: true, manualSorting: true,
        pageCount: totalPages, getCoreRowModel: getCoreRowModel(), getRowId: (row, index) => row.url ?? String(index),
        enableRowSelection: false, enableSortingRemoval: false,
        state: { sorting: sorting ? [sorting] : [], columnVisibility: preferences.visibility, columnOrder: preferences.order },
        onSortingChange: next => { const sorted = typeof next === 'function' ? next(sorting ? [sorting] : []) : next; if (sorted[0]) onSort(sorted[0].id); },
        onColumnVisibilityChange: next => setPreferences(previous => ({ ...previous, visibility: typeof next === 'function' ? next(previous.visibility) : next })),
        onColumnOrderChange: next => setPreferences(previous => ({ ...previous, order: typeof next === 'function' ? next(previous.order) : next })),
    });
    const fields = columns.filter(column => column.id !== 'actions').map(column => ({ id: column.id!, label: String(column.header ?? column.id), Icon: Table2, definition: column }));
    return <PreviewDataTable table={table} fields={fields} label={label} resultCount={totalRows} search={search} filters={filters} actions={null} bulkActions={null} empty={empty} pagination={pagination} onRestore={() => setPreferences({ visibility: {}, order: [] })} onOpenRow={row => { if (row.url) onOpenRow(row.url); }} />;
}
