import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import { t } from '../../i18n';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { formatBytes, formatNumber } from './operationsFormat';

export type DataTableSummary = { name: string; rows: number; approximate: boolean; bytes: number };

const label = (key: string) => t(`ADMIN_OPERATIONS.DATA.${key}`);

export default function DataBrowser({ tables }: { tables: DataTableSummary[] }) {
    const [query, setQuery] = useState('');
    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return needle === '' ? tables : tables.filter(table => table.name.includes(needle));
    }, [tables, query]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} />

            <Card className="gap-0 py-0">
                <div className="border-b border-console-border p-4">
                    <Input
                        type="search"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder={label('SEARCH_TABLES')}
                        aria-label={label('SEARCH_TABLES')}
                        className="sm:max-w-sm"
                    />
                </div>
                {visible.length === 0 ? (
                    <EmptyState icon="i-lucide-database" title={label('NO_TABLES')} />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{label('COLUMNS.TABLE')}</TableHead>
                                <TableHead className="text-right">{label('COLUMNS.ROWS')}</TableHead>
                                <TableHead className="text-right">{label('COLUMNS.SIZE')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map(table => (
                                <TableRow key={table.name}>
                                    <TableCell>
                                        <Link href={`/admin/data/${table.name}`} className="font-mono text-console-brand hover:underline">
                                            {table.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                                        {table.approximate ? '≈ ' : ''}
                                        {formatNumber(table.rows)}
                                        {table.approximate ? <span className="sr-only"> ({label('APPROXIMATE')})</span> : null}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right tabular-nums text-console-muted-foreground">
                                        {formatBytes(table.bytes)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
