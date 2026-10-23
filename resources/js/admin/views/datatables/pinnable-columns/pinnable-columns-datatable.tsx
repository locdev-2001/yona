import { useState, type ReactNode } from 'react';
import { getCoreRowModel, useReactTable, type Column, type ColumnDef, type ColumnPinningState } from '@tanstack/react-table';
import { ArrowLeftFromLineIcon, ArrowRightFromLineIcon, EllipsisIcon, PinOffIcon } from '@admin/components/icons';
import { PreviewButton } from '../../../../superadmin/design-preview/components';
import { DataTableGrid } from '../../../../superadmin/design-preview/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@admin/components/ui/dropdown-menu';
import '../../../../superadmin/resource/resources.css';
export type PinLabels = { stickLeft: string; stickRight: string; unpin: (column: string) => string; options: (column: string) => string; };
type Props<TRecord> = { data: TRecord[]; columns: ColumnDef<TRecord, any>[]; getRowId: (row: TRecord, index: number) => string; initialPinning?: ColumnPinningState; labels: PinLabels; empty: ReactNode; className?: string; };
function PinActions<TRecord>({ column, labels }: { column: Column<TRecord>; labels: PinLabels }) {
    if (!column.getCanPin()) return null;
    return column.getIsPinned() ? <PreviewButton appearance="ghost" className="data-table-icon-button" onClick={() => column.pin(false)} aria-label={labels.unpin(column.id)}><PinOffIcon /></PreviewButton> : <DropdownMenu><DropdownMenuTrigger render={<PreviewButton appearance="ghost" className="data-table-icon-button" aria-label={labels.options(column.id)} />}><EllipsisIcon /></DropdownMenuTrigger><DropdownMenuContent className="catalogue-popup" align="end"><DropdownMenuItem onClick={() => column.pin('left')}><ArrowLeftFromLineIcon />{labels.stickLeft}</DropdownMenuItem><DropdownMenuItem onClick={() => column.pin('right')}><ArrowRightFromLineIcon />{labels.stickRight}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
export default function DataTablePinnableColumns<TRecord>({ data, columns, getRowId, initialPinning = {}, labels, empty, className = '' }: Props<TRecord>) {
    const [columnPinning, setColumnPinning] = useState(initialPinning);
    const table = useReactTable({ data, columns, getRowId, getCoreRowModel: getCoreRowModel(), onColumnPinningChange: setColumnPinning, state: { columnPinning }, manualSorting: true, manualPagination: true, enableRowSelection: false });
    return <div className={`preview-data-table console-operation-table ${className}`}><DataTableGrid table={table} empty={empty} pinning renderHeaderActions={column => <PinActions column={column} labels={labels} />} /></div>;
}
