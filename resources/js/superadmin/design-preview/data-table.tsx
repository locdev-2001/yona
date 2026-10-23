import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flexRender, type Column, type ColumnDef, type Table as TableInstance } from '@tanstack/react-table';
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowDown,
    ArrowDownUp,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    List,
    LockKeyhole,
    Settings2,
    X,
    type IconComponent,
} from '@admin/components/icons';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@admin/components/ui/popover';
import { Switch } from '@admin/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@admin/components/ui/table';
import { PreviewButton, SearchField } from './components';
import { previewCopy, previewText } from './copy';
import { spacingPixels } from './tokens';
import './data-table.css';

export type TableField<TRecord> = {
    id: string;
    label: string;
    Icon: IconComponent;
    definition: ColumnDef<TRecord>;
};

export function SortableTableHeading<TRecord>({
    column,
    label,
    Icon,
}: {
    column: Column<TRecord>;
    label: string;
    Icon: IconComponent;
}) {
    const sorted = column.getIsSorted();
    return (
        <button
            className="data-table-sort"
            onClick={column.getToggleSortingHandler()}
            aria-label={previewText('datatable_sort', label)}
        >
            <Icon />
            <span>{label}</span>
            {sorted === 'asc' ? <ArrowUp /> : sorted === 'desc' ? <ArrowDown /> : <ArrowDownUp className="sort-idle" />}
        </button>
    );
}

function SortableField<TRecord>({
    field,
    column,
    locked,
}: {
    field: TableField<TRecord>;
    column: Column<TRecord>;
    locked: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: field.id,
        disabled: locked,
    });
    return (
        <div
            ref={setNodeRef}
            className="data-table-column-option"
            data-dragging={isDragging}
            style={{ transform: CSS.Transform.toString(transform), transition } as CSSProperties}
        >
            {locked ? (
                <span className="column-lock" title={previewCopy.datatable_required}>
                    <LockKeyhole />
                </span>
            ) : (
                <button
                    type="button"
                    className="column-drag-handle"
                    {...attributes}
                    {...listeners}
                    aria-label={previewText('datatable_column_reorder', field.label)}
                    title={previewCopy.datatable_reorder_hint}
                >
                    <GripVertical />
                </button>
            )}
            <field.Icon />
            <span className="column-option-label">{field.label}</span>
            <Switch
                size="sm"
                checked={column.getIsVisible()}
                disabled={locked}
                aria-label={previewText('datatable_column_toggle', field.label)}
                onCheckedChange={(value) => column.toggleVisibility(value)}
            />
        </div>
    );
}

function ColumnView<TRecord>({
    table,
    fields,
    onRestore,
}: {
    table: TableInstance<TRecord>;
    fields: TableField<TRecord>[];
    onRestore: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const ordered = table.getAllLeafColumns().flatMap((column) => {
        const field = fields.find((candidate) => candidate.id === column.id);
        return field ? [{ field, column }] : [];
    });
    const filtered = ordered.filter(({ field }) =>
        field.label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')),
    );
    const optional = ordered.filter(({ column }) => column.getCanHide());
    const allHidden = optional.every(({ column }) => !column.getIsVisible());
    function reorder(event: DragEndEvent) {
        if (!event.over || event.active.id === event.over.id) return;
        const order = ordered.map(({ field }) => field.id);
        const from = order.indexOf(String(event.active.id)),
            to = order.indexOf(String(event.over.id));
        if (
            from < 0 ||
            to < 0 ||
            !table.getColumn(order[from])?.getCanHide() ||
            !table.getColumn(order[to])?.getCanHide()
        )
            return;
        table.setColumnOrder(['select', ...arrayMove(order, from, to), 'actions']);
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<PreviewButton appearance="ghost" className="data-table-customize-trigger" />}>
                <Settings2 />
                {previewCopy.datatable_customize}
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={spacingPixels('control-gap')}
                className="catalogue-overlay data-table-column-view"
                initialFocus={(interaction) => (interaction === 'touch' ? true : searchRef.current)}
            >
                <div className="column-view-title">
                    <PopoverTitle>{previewCopy.datatable_customize}</PopoverTitle>
                    <PreviewButton
                        appearance="ghost"
                        className="data-table-icon-button"
                        aria-label={previewCopy.datatable_customize_close}
                        onClick={() => setOpen(false)}
                    >
                        <X />
                    </PreviewButton>
                </div>
                <SearchField
                    inputRef={searchRef}
                    label={previewCopy.datatable_column_search}
                    placeholder={previewCopy.datatable_column_placeholder}
                    clearLabel={previewCopy.datatable_column_clear}
                    value={query}
                    onChange={setQuery}
                />
                <div className="column-view-subtitle">
                    <span>{previewCopy.datatable_shown}</span>
                    <button onClick={() => optional.forEach(({ column }) => column.toggleVisibility(allHidden))}>
                        {allHidden ? previewCopy.datatable_show_all : previewCopy.datatable_hide_all}
                    </button>
                </div>
                <div className="column-view-list">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={reorder}
                        accessibility={{
                            screenReaderInstructions: { draggable: previewCopy.datatable_reorder_hint },
                            announcements: {
                                onDragStart: ({ active }) =>
                                    previewText(
                                        'datatable_column_reorder',
                                        fields.find((field) => field.id === active.id)?.label ?? '',
                                    ),
                                onDragOver: () => undefined,
                                onDragEnd: () => previewCopy.datatable_customize,
                                onDragCancel: () => previewCopy.datatable_customize,
                            },
                        }}
                    >
                        <SortableContext
                            items={filtered.map(({ field }) => field.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {filtered.map(({ field, column }) => (
                                <SortableField
                                    key={field.id}
                                    field={field}
                                    column={column}
                                    locked={!column.getCanHide()}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {filtered.length === 0 && <p className="column-view-empty">{previewCopy.datatable_no_columns}</p>}
                </div>
                <div className="column-view-footer">
                    <button
                        onClick={() => {
                            onRestore();
                            setQuery('');
                        }}
                    >
                        {previewCopy.datatable_restore}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function PreviewDataTable<TRecord>({
    table,
    fields,
    search,
    filters,
    actions,
    bulkActions,
    onRestore,
    empty,
}: {
    table: TableInstance<TRecord>;
    fields: TableField<TRecord>[];
    search: ReactNode;
    filters: ReactNode;
    actions: ReactNode;
    bulkActions: ReactNode;
    onRestore: () => void;
    empty: ReactNode;
}) {
    const rows = table.getRowModel().rows;
    const total = table.getFilteredRowModel().rows.length;
    const selected = table.getSelectedRowModel().rows.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    const pageCount = Math.max(1, table.getPageCount());
    return (
        <div className="preview-data-table">
            <div className="data-table-toolbar">
                <div className="data-table-view-label">
                    <List />
                    <strong>{previewCopy.datatable_list}</strong>
                    <span className="data-table-result-count">{total}</span>
                </div>
                <div className="data-table-tools">
                    {search}
                    {actions}
                    <ColumnView table={table} fields={fields} onRestore={onRestore} />
                </div>
            </div>
            <div className="data-table-filters">
                {filters}
                <span className="data-table-visible-count">
                    {previewText('datatable_columns_count', table.getVisibleLeafColumns().length - 2)}
                </span>
            </div>
            {selected > 0 && (
                <div className="data-table-bulk" role="status">
                    <strong>{previewText('datatable_selected', selected)}</strong>
                    {bulkActions}
                    <PreviewButton
                        appearance="ghost"
                        className="data-table-icon-button"
                        aria-label={previewCopy.datatable_deselect}
                        onClick={() => table.resetRowSelection()}
                    >
                        <X />
                    </PreviewButton>
                </div>
            )}
            <div className="data-table-grid" tabIndex={0} role="region" aria-label={previewCopy.datatable_scroll}>
                <Table style={{ width: table.getTotalSize(), minWidth: '100%' }}>
                    <colgroup>
                        {table.getVisibleLeafColumns().map((column) => (
                            <col key={column.id} style={{ width: column.getSize() }} />
                        ))}
                    </colgroup>
                    <TableHeader>
                        {table.getHeaderGroups().map((group) => (
                            <TableRow key={group.id}>
                                {group.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        data-column={header.column.id}
                                        scope="col"
                                        aria-sort={
                                            header.column.getIsSorted() === 'asc'
                                                ? 'ascending'
                                                : header.column.getIsSorted() === 'desc'
                                                  ? 'descending'
                                                  : undefined
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {rows.length > 0 ? (
                            rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? 'selected' : undefined}
                                    aria-selected={row.getIsSelected()}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} data-column={cell.column.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={table.getVisibleLeafColumns().length}>{empty}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="data-table-pagination">
                <span className="data-table-range">
                    {previewText(
                        'datatable_range',
                        total === 0 ? 0 : pageIndex * pageSize + 1,
                        Math.min((pageIndex + 1) * pageSize, total),
                        total,
                    )}
                </span>
                <label className="data-table-page-size">
                    <span>{previewCopy.datatable_page_size}</span>
                    <select
                        aria-label={previewCopy.datatable_page_size}
                        value={pageSize}
                        onChange={(event) => table.setPageSize(Number(event.target.value))}
                    >
                        {[10, 20, 50].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
                <nav className="data-table-page-controls" aria-label={previewCopy.datatable_pagination}>
                    <span>{previewText('datatable_page_summary', pageIndex + 1, pageCount)}</span>
                    <PreviewButton
                        appearance="ghost"
                        className="data-table-icon-button"
                        disabled={!table.getCanPreviousPage()}
                        aria-label={previewCopy.datatable_prev}
                        onClick={() => table.previousPage()}
                    >
                        <ChevronLeft />
                    </PreviewButton>
                    <PreviewButton
                        appearance="ghost"
                        className="data-table-icon-button"
                        disabled={!table.getCanNextPage()}
                        aria-label={previewCopy.datatable_next}
                        onClick={() => table.nextPage()}
                    >
                        <ChevronRight />
                    </PreviewButton>
                </nav>
            </div>
        </div>
    );
}
