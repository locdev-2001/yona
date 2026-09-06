import type { ReactNode } from 'react';

import type { TableModel } from './useTableModel';

// Port từ dashboard/components/table/Table.vue (bỏ nhánh sắp xếp — chưa màn nào cần).

export interface TableColumn<TRow> {
    id: string;
    header: string;
    size?: number;
    cell: (row: TRow, index: number) => ReactNode;
}

interface TableProps<TRow> {
    table: TableModel<TRow>;
    columns: TableColumn<TRow>[];
    rowKey: (row: TRow, index: number) => string | number;
    fixed?: boolean;
    type?: 'relaxed' | 'compact';
    className?: string;
}

export default function Table<TRow>({
    table,
    columns,
    rowKey,
    fixed = false,
    type = 'relaxed',
    className = '',
}: TableProps<TRow>) {
    const isRelaxed = type === 'relaxed';
    const headerClass = isRelaxed
        ? 'ltr:first:rounded-bl-lg ltr:first:rounded-tl-lg ltr:last:rounded-br-lg ltr:last:rounded-tr-lg rtl:first:rounded-br-lg rtl:first:rounded-tr-lg rtl:last:rounded-bl-lg rtl:last:rounded-tl-lg'
        : '';

    return (
        <table className={[fixed ? 'table-fixed' : '', className].filter(Boolean).join(' ')}>
            <thead className="sticky top-0 z-10 bg-n-slate-1">
                <tr className="rounded-xl">
                    {columns.map(column => (
                        <th
                            key={column.id}
                            style={column.size ? { width: `${column.size}px` } : undefined}
                            className={`text-left py-3 px-5 font-medium text-sm text-n-slate-12 ${headerClass}`}
                        >
                            <div className="flex place-items-center gap-1">{column.header}</div>
                        </th>
                    ))}
                </tr>
            </thead>

            <tbody className="divide-y divide-n-slate-2">
                {table.rows.map((row, rowIndex) => (
                    <tr key={rowKey(row, rowIndex)}>
                        {columns.map(column => (
                            <td key={column.id} className={isRelaxed ? 'py-4 px-5' : 'py-2 px-5'}>
                                {column.cell(row, rowIndex)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
