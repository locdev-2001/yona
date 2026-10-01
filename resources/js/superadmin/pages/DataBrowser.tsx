import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { DatabaseIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Card } from '@admin/components/ui/card';
import DataTableBasic from '@admin/views/datatables/basic/basic-datatable';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import { ListToolbar } from '@admin/views/datatables/list/list-toolbar';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatBytes, formatNumber } from './operationsFormat';

export type DataTableSummary = { name: string; rows: number; approximate: boolean; bytes: number };

const label = (key: string) => t(`ADMIN_OPERATIONS.DATA.${key}`);

const columns: ColumnDef<DataTableSummary>[] = [
    {
        id: 'name',
        header: () => label('COLUMNS.TABLE'),
        cell: ({ row }) => (
            <Link href={`/admin/data/${row.original.name}`} className="font-mono font-medium hover:underline">
                {row.original.name}
            </Link>
        ),
    },
    {
        id: 'rows',
        header: () => <div className="text-right">{label('COLUMNS.ROWS')}</div>,
        cell: ({ row }) => (
            <div className="text-right font-medium tabular-nums">
                {row.original.approximate ? '≈ ' : ''}
                {formatNumber(row.original.rows)}
                {row.original.approximate ? <span className="sr-only"> ({label('APPROXIMATE')})</span> : null}
            </div>
        ),
    },
    {
        id: 'size',
        header: () => <div className="text-right">{label('COLUMNS.SIZE')}</div>,
        cell: ({ row }) => <div className="text-muted-foreground text-right tabular-nums">{formatBytes(row.original.bytes)}</div>,
    },
];

export default function DataBrowser({ tables }: { tables: DataTableSummary[] }) {
    const [query, setQuery] = useState('');
    const searchId = useId();
    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return needle === '' ? tables : tables.filter(table => table.name.includes(needle));
    }, [tables, query]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            <Card className="gap-0 py-0">
                <div className="border-b">
                    <ListToolbar
                        search={{
                            id: searchId,
                            label: label('SEARCH_TABLES'),
                            placeholder: label('SEARCH_TABLES'),
                            value: query,
                            onChange: setQuery,
                        }}
                    />
                </div>
                <DataTableBasic
                    data={visible}
                    columns={columns}
                    getRowId={table => table.name}
                    empty={<DataTableEmpty icon={<DatabaseIcon className="size-4" />} title={label('NO_TABLES')} />}
                />
            </Card>
        </div>
    );
}
