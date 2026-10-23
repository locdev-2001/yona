import { useEffect, useMemo, useState } from 'react';
import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type Column,
    type ColumnDef,
    type ColumnFiltersState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table';
import {
    Activity,
    ArrowDownToLine,
    ArrowUpRight,
    AtSign,
    CalendarDays,
    Check,
    ChevronDown,
    CircleHelp,
    Ellipsis,
    Filter,
    Hash,
    MessageCircle,
    Phone,
    Search,
    ShieldCheck,
    UserRound,
    Users,
    X,
} from '@admin/components/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import { Checkbox } from '@admin/components/ui/checkbox';
import { PreviewButton, SearchField, Sparkline, StatusBadge } from './components';
import { PreviewDataTable, SortableTableHeading, type TableField } from './data-table';
import { previewCopy, previewText } from './copy';
import { dimensionTokens } from './tokens';

type DirectoryStatus = 'active' | 'attention' | 'paused';
type DirectoryPerson = {
    id: string;
    name: string;
    email: string;
    initials: string;
    status: DirectoryStatus;
    channel: string;
    secured: boolean;
    joined: string;
    lastSeen: string;
    phone: string;
    color: number;
};

const statusPresentation = {
    active: { label: previewCopy.datatable_normal, tone: 'positive' },
    attention: { label: previewCopy.datatable_attention, tone: 'warning' },
    paused: { label: previewCopy.datatable_paused, tone: 'system' },
} as const;
const channelOptions = ['Yona', previewCopy.zalo_ca_nhan, 'Email'];
const people = [
    ['Ngọc Anh', 'ngocanh', 'NA'],
    ['Thanh Mai', 'thanhmai', 'TM'],
    ['Hà Linh', 'halinh', 'HL'],
    ['Minh Khang', 'minhkhang', 'MK'],
    ['Bảo Ngọc', 'baongoc', 'BN'],
    ['Tuấn Anh', 'tuananh', 'TA'],
    ['Thu Hà', 'thuha', 'TH'],
    ['Đức Huy', 'duchuy', 'DH'],
    ['Phương Thảo', 'phuongthao', 'PT'],
    ['Quang Minh', 'quangminh', 'QM'],
    ['Khánh Ly', 'khanhly', 'KL'],
    ['Hoàng Nam', 'hoangnam', 'HN'],
    ['Lan Anh', 'lananh', 'LA'],
    ['Gia Bảo', 'giabao', 'GB'],
    ['Minh Châu', 'minhchau', 'MC'],
    ['Trung Kiên', 'trungkien', 'TK'],
    ['Ngọc Hà', 'ngocha', 'NH'],
    ['Hải Đăng', 'haidang', 'HD'],
    ['Mai Chi', 'maichi', 'MC'],
    ['Thành Đạt', 'thanhdat', 'TD'],
    ['Yến Nhi', 'yennhi', 'YN'],
    ['Đình Phong', 'dinhphong', 'DP'],
    ['Kim Ngân', 'kimngan', 'KN'],
    ['Anh Thư', 'anhthu', 'AT'],
];
const directoryPeople: DirectoryPerson[] = people.map(([name, slug, initials], index) => ({
    id: `YN-${String(1024 + index).padStart(4, '0')}`,
    name,
    email: `${slug}@example.test`,
    initials,
    status: [3, 9, 15, 21].includes(index) ? 'attention' : [7, 19].includes(index) ? 'paused' : 'active',
    channel: channelOptions[index % channelOptions.length],
    secured: index % 5 !== 0,
    joined: `2026-10-${String(2 + (index % 19)).padStart(2, '0')}`,
    lastSeen: `2026-10-${index % 4 === 0 ? '21' : '22'}T${String(8 + (index % 9)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
    phone: `+84 90 ${String(1000000 + index * 1739)}`,
    color: index % 4,
}));
const defaultVisibility: VisibilityState = { id: false, phone: false, joined: false };
const defaultFieldOrder = ['name', 'email', 'status', 'channel', 'secured', 'lastSeen', 'joined', 'id', 'phone'];
const preferencesKey = 'yona-admin-preview:directory-columns';

function readColumnPreferences(): { visibility: VisibilityState; order: string[] } {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(preferencesKey) ?? 'null');
        if (saved && typeof saved === 'object' && 'visibility' in saved && 'order' in saved) {
            const visibility: VisibilityState = { ...defaultVisibility };
            if (saved.visibility && typeof saved.visibility === 'object') {
                for (const [id, value] of Object.entries(saved.visibility))
                    if (defaultFieldOrder.includes(id) && id !== 'name' && typeof value === 'boolean')
                        visibility[id] = value;
            }
            const stored = Array.isArray(saved.order)
                ? saved.order.filter(
                      (id): id is string => typeof id === 'string' && defaultFieldOrder.includes(id) && id !== 'name',
                  )
                : [];
            return {
                visibility,
                order: [
                    'select',
                    'name',
                    ...new Set([...stored, ...defaultFieldOrder.filter((id) => id !== 'name')]),
                    'actions',
                ],
            };
        }
    } catch {
        /* Tùy chỉnh bảng vẫn dùng được khi trình duyệt không cho lưu. */
    }
    return { visibility: { ...defaultVisibility }, order: ['select', ...defaultFieldOrder, 'actions'] };
}

function columnWidth(key: keyof typeof dimensionTokens): number {
    return Number.parseInt(dimensionTokens[key], 10);
}
function formatDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
        new Date(value),
    );
}
function formatLastSeen(value: string): string {
    const date = new Date(value);
    return previewText(
        'datatable_date_time',
        new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date),
        new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date),
    );
}
function cellText(person: DirectoryPerson, id: string): string {
    if (id === 'status') return statusPresentation[person.status].label;
    if (id === 'secured') return person.secured ? previewCopy.datatable_enabled : previewCopy.datatable_disabled;
    if (id === 'joined') return formatDate(person.joined);
    if (id === 'lastSeen') return formatLastSeen(person.lastSeen);
    return String(person[id as keyof DirectoryPerson] ?? '');
}
function exportDirectory(records: DirectoryPerson[], fields: { id: string; label: string }[]) {
    const quote = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
    const csv = [
        fields.map((field) => quote(field.label)).join(','),
        ...records.map((person) => fields.map((field) => quote(cellText(person, field.id))).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yona-nguoi-dung-mau.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function FilterMenu({
    label,
    icon: Icon,
    value,
    allLabel,
    options,
    onChange,
}: {
    label: string;
    icon: typeof Filter;
    value: string;
    allLabel: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<PreviewButton appearance="ghost" className="data-table-filter-button" />}
                aria-label={label}
            >
                <Icon />
                <span>{options.find((option) => option.value === value)?.label ?? allLabel}</span>
                <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="catalogue-popup data-table-filter-menu">
                {[{ value: 'all', label: allLabel }, ...options].map((option) => (
                    <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
                        <span>{option.label}</span>
                        {option.value === value && <Check />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function DirectoryTableDemo() {
    const [initialPreferences] = useState(readColumnPreferences);
    const [columnVisibility, setColumnVisibility] = useState(initialPreferences.visibility);
    const [columnOrder, setColumnOrder] = useState(initialPreferences.order);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [query, setQuery] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const statusFilter = String(columnFilters.find((filter) => filter.id === 'status')?.value ?? 'all');
    const channelFilter = String(columnFilters.find((filter) => filter.id === 'channel')?.value ?? 'all');
    const setFilter = (id: string, value: string) =>
        setColumnFilters((current) => [
            ...current.filter((filter) => filter.id !== id),
            ...(value === 'all' ? [] : [{ id, value }]),
        ]);
    useEffect(() => {
        try {
            localStorage.setItem(preferencesKey, JSON.stringify({ visibility: columnVisibility, order: columnOrder }));
        } catch {
            /* Lựa chọn vẫn được giữ trong phiên hiện tại. */
        }
    }, [columnVisibility, columnOrder]);
    const fields = useMemo<TableField<DirectoryPerson>[]>(
        () => [
            {
                id: 'name',
                label: previewCopy.datatable_name,
                Icon: UserRound,
                definition: {
                    accessorKey: 'name',
                    enableHiding: false,
                    size: columnWidth('table-person-width'),
                    cell: ({ row }) => (
                        <div className="data-table-person">
                            <span className={`data-table-avatar data-table-avatar--${row.original.color}`}>
                                {row.original.initials}
                            </span>
                            <strong>{row.original.name}</strong>
                        </div>
                    ),
                    sortingFn: (left, right) => left.original.name.localeCompare(right.original.name, 'vi'),
                },
            },
            {
                id: 'email',
                label: previewCopy.datatable_email,
                Icon: AtSign,
                definition: {
                    accessorKey: 'email',
                    size: columnWidth('table-email-width'),
                    cell: ({ getValue }) => <span className="data-table-email">{String(getValue())}</span>,
                },
            },
            {
                id: 'status',
                label: previewCopy.datatable_status,
                Icon: Activity,
                definition: {
                    accessorKey: 'status',
                    size: columnWidth('table-status-width'),
                    filterFn: 'equals',
                    cell: ({ row }) => {
                        const status = statusPresentation[row.original.status];
                        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
                    },
                },
            },
            {
                id: 'channel',
                label: previewCopy.datatable_channel,
                Icon: MessageCircle,
                definition: {
                    accessorKey: 'channel',
                    size: columnWidth('table-channel-width'),
                    filterFn: 'equals',
                    cell: ({ getValue }) => (
                        <span className="data-table-channel">
                            <MessageCircle />
                            {String(getValue())}
                        </span>
                    ),
                },
            },
            {
                id: 'secured',
                label: previewCopy.datatable_security,
                Icon: ShieldCheck,
                definition: {
                    accessorKey: 'secured',
                    size: columnWidth('table-security-width'),
                    cell: ({ row }) => (
                        <span className={`data-table-security ${row.original.secured ? 'is-secure' : ''}`}>
                            {row.original.secured ? <ShieldCheck /> : <CircleHelp />}
                            {row.original.secured ? previewCopy.datatable_enabled : previewCopy.datatable_disabled}
                        </span>
                    ),
                },
            },
            {
                id: 'lastSeen',
                label: previewCopy.datatable_last_seen,
                Icon: Activity,
                definition: {
                    accessorKey: 'lastSeen',
                    size: columnWidth('table-date-width'),
                    cell: ({ getValue }) => (
                        <time dateTime={String(getValue())}>{formatLastSeen(String(getValue()))}</time>
                    ),
                },
            },
            {
                id: 'joined',
                label: previewCopy.datatable_joined,
                Icon: CalendarDays,
                definition: {
                    accessorKey: 'joined',
                    size: columnWidth('table-date-width'),
                    cell: ({ getValue }) => <time dateTime={String(getValue())}>{formatDate(String(getValue()))}</time>,
                },
            },
            {
                id: 'id',
                label: previewCopy.datatable_id,
                Icon: Hash,
                definition: { accessorKey: 'id', size: columnWidth('table-id-width') },
            },
            {
                id: 'phone',
                label: previewCopy.datatable_phone,
                Icon: Phone,
                definition: { accessorKey: 'phone', size: columnWidth('table-phone-width') },
            },
        ],
        [],
    );
    const columns = useMemo<ColumnDef<DirectoryPerson>[]>(
        () => [
            {
                id: 'select',
                enableSorting: false,
                enableHiding: false,
                size: columnWidth('table-selection-width'),
                header: ({ table }) => (
                    <Checkbox
                        aria-label={previewCopy.datatable_select_page}
                        checked={table.getIsAllPageRowsSelected()}
                        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        aria-label={previewText('datatable_row_select', row.original.name)}
                        checked={row.getIsSelected()}
                        onCheckedChange={(checked) => row.toggleSelected(checked)}
                    />
                ),
            },
            ...fields.map((field) => ({
                ...field.definition,
                id: field.id,
                header: ({ column }: { column: Column<DirectoryPerson> }) => (
                    <SortableTableHeading column={column} label={field.label} Icon={field.Icon} />
                ),
            })),
            {
                id: 'actions',
                enableSorting: false,
                enableHiding: false,
                size: columnWidth('table-selection-width'),
                header: () => null,
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={<PreviewButton appearance="ghost" className="data-table-icon-button" />}
                            aria-label={previewText('datatable_row_actions', row.original.name)}
                        >
                            <Ellipsis />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="catalogue-popup data-table-filter-menu">
                            <DropdownMenuItem onClick={() => exportDirectory([row.original], fields)}>
                                <ArrowDownToLine />
                                {previewCopy.datatable_export_row}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() =>
                                    setColumnFilters((current) => [
                                        ...current.filter((filter) => filter.id !== 'channel'),
                                        { id: 'channel', value: row.original.channel },
                                    ])
                                }
                            >
                                <Filter />
                                {previewCopy.datatable_filter_row_channel}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        [fields],
    );
    const table = useReactTable({
        data: directoryPeople,
        columns,
        getRowId: (person) => person.id,
        state: { sorting, rowSelection, globalFilter: query, columnFilters, columnVisibility, columnOrder },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setQuery,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        globalFilterFn: (row, _columnId, search: string) =>
            `${row.original.name} ${row.original.email}`
                .toLocaleLowerCase('vi')
                .includes(search.toLocaleLowerCase('vi')),
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });
    function clearFilters() {
        setQuery('');
        setColumnFilters([]);
    }
    function exportRows(selected: boolean) {
        const records = (selected ? table.getSelectedRowModel() : table.getFilteredRowModel()).rows.map(
            (row) => row.original,
        );
        const visibleFields = table.getVisibleLeafColumns().flatMap((column) => {
            const field = fields.find((candidate) => candidate.id === column.id);
            return field ? [field] : [];
        });
        exportDirectory(records, visibleFields);
    }
    return (
        <div className="directory-table-demo">
            <div className="directory-summary" aria-label={previewCopy.datatable_title}>
                {[
                    {
                        title: previewCopy.datatable_total,
                        value: directoryPeople.length,
                        note: previewCopy.datatable_total_delta,
                        Icon: Users,
                        tone: 'brand',
                        points: [30, 42, 37, 58, 49, 60, 68],
                    },
                    {
                        title: previewCopy.datatable_active,
                        value: directoryPeople.filter((person) => person.status === 'active').length,
                        note: previewCopy.datatable_active_delta,
                        Icon: Activity,
                        tone: 'positive',
                        points: [32, 48, 39, 57, 49, 65, 68],
                    },
                    {
                        title: previewCopy.datatable_secure,
                        value: directoryPeople.filter((person) => person.secured).length,
                        note: previewCopy.datatable_secure_delta,
                        Icon: ShieldCheck,
                        tone: 'system',
                        points: [28, 28, 42, 46, 61, 55, 68],
                    },
                ].map((summary) => (
                    <div className="directory-summary-item" key={summary.title}>
                        <span className="directory-summary-label">
                            <summary.Icon />
                            {summary.title}
                        </span>
                        <div>
                            <strong>{summary.value}</strong>
                            <Sparkline points={summary.points} tone={summary.tone as 'brand' | 'positive' | 'system'} />
                        </div>
                        <span className="directory-summary-note">
                            <ArrowUpRight />
                            {summary.note}
                        </span>
                    </div>
                ))}
            </div>
            <PreviewDataTable
                table={table}
                fields={fields}
                onRestore={() => {
                    setColumnVisibility({ ...defaultVisibility });
                    setColumnOrder(['select', ...defaultFieldOrder, 'actions']);
                }}
                search={
                    <SearchField
                        label={previewCopy.datatable_search}
                        placeholder={previewCopy.datatable_search_placeholder}
                        clearLabel={previewCopy.datatable_search_clear}
                        value={query}
                        onChange={setQuery}
                    />
                }
                actions={
                    <PreviewButton
                        appearance="ghost"
                        disabled={table.getFilteredRowModel().rows.length === 0}
                        onClick={() => exportRows(false)}
                    >
                        <ArrowDownToLine />
                        {previewCopy.datatable_export}
                    </PreviewButton>
                }
                bulkActions={
                    <PreviewButton appearance="ghost" onClick={() => exportRows(true)}>
                        <ArrowDownToLine />
                        {previewText('datatable_export_selected', table.getSelectedRowModel().rows.length)}
                    </PreviewButton>
                }
                filters={
                    <>
                        <FilterMenu
                            label={previewCopy.datatable_filter_status}
                            icon={Activity}
                            value={statusFilter}
                            allLabel={previewCopy.datatable_all_status}
                            options={Object.entries(statusPresentation).map(([value, status]) => ({
                                value,
                                label: status.label,
                            }))}
                            onChange={(value) => setFilter('status', value)}
                        />
                        <FilterMenu
                            label={previewCopy.datatable_filter_channel}
                            icon={MessageCircle}
                            value={channelFilter}
                            allLabel={previewCopy.datatable_all_channel}
                            options={channelOptions.map((value) => ({ value, label: value }))}
                            onChange={(value) => setFilter('channel', value)}
                        />
                        {(query || columnFilters.length > 0) && (
                            <PreviewButton
                                appearance="ghost"
                                className="data-table-clear-filters"
                                onClick={clearFilters}
                            >
                                <X />
                                {previewCopy.datatable_clear_filters}
                            </PreviewButton>
                        )}
                    </>
                }
                empty={
                    <div className="data-table-empty">
                        <Search />
                        <strong>{previewCopy.datatable_empty_title}</strong>
                        <p>{previewCopy.datatable_empty_description}</p>
                        <PreviewButton onClick={clearFilters}>{previewCopy.datatable_clear_filters}</PreviewButton>
                    </div>
                }
            />
            <p className="data-table-sample-note">{previewCopy.datatable_sample}</p>
        </div>
    );
}
