import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ActivityIcon } from 'lucide-react';

import { formatDateTime } from '@admin/lib/format';
import { cn } from '@admin/lib/utils';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { ListTable } from '@admin/views/datatables/list/list-table';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatNumber, formatRelative } from './operationsFormat';

export type FeatureRow = {
    key: string;
    label: string;
    group: 'activation' | 'feature';
    accounts: Record<'7d' | '30d' | '90d' | 'all', number>;
    events: number;
    lastAt: string | null;
    trend: number[];
    url: string;
};

type Props = {
    features: FeatureRow[];
    windows: string[];
    trendDays: number;
};

const GROUPS = ['activation', 'feature'] as const;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.FEATURE_USAGE.${key}`, params);

const NUMERIC = { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right font-num' };

// Số lượt mỗi ngày trong 30 ngày: cột nhỏ trên rãnh nền, ngày 0 lượt vẫn có rãnh để nhịp đều.
export function TrendBars({ trend }: { trend: number[] }) {
    const max = Math.max(1, ...trend);
    const total = trend.reduce((sum, count) => sum + count, 0);

    return (
        <div role="img" aria-label={label('TREND_SUMMARY', { count: formatNumber(total) })} className="flex h-8 w-32 items-stretch gap-px">
            {trend.map((count, index) => (
                <span key={index} className="bg-primary-50 flex min-w-0 flex-1 flex-col justify-end">
                    {count > 0 ? <span className="bg-primary-600 w-full" style={{ height: `${Math.max(12, (count / max) * 100)}%` }} /> : null}
                </span>
            ))}
        </div>
    );
}

const accountsColumn = (window: '7d' | '30d' | '90d' | 'all'): ColumnDef<FeatureRow> => ({
    id: `accounts_${window}`,
    header: () => label(`COLUMNS.ACCOUNTS_${window.toUpperCase()}`),
    cell: ({ row }) => (
        <span className={cn(row.original.accounts[window] === 0 && 'text-muted-foreground')}>{formatNumber(row.original.accounts[window])}</span>
    ),
    meta: NUMERIC,
});

const columns: ColumnDef<FeatureRow>[] = [
    {
        id: 'feature',
        header: () => label('COLUMNS.FEATURE'),
        cell: ({ row }) => (
            <Link
                href={row.original.url}
                aria-label={label('OPEN', { feature: row.original.label })}
                className="inline-flex min-h-11 min-w-48 items-center font-medium hover:underline md:min-h-0"
            >
                {row.original.label}
            </Link>
        ),
    },
    accountsColumn('7d'),
    accountsColumn('30d'),
    accountsColumn('90d'),
    accountsColumn('all'),
    {
        id: 'events',
        header: () => label('COLUMNS.EVENTS'),
        cell: ({ row }) => <span className={cn(row.original.events === 0 && 'text-muted-foreground')}>{formatNumber(row.original.events)}</span>,
        meta: NUMERIC,
    },
    {
        id: 'last',
        header: () => label('COLUMNS.LAST'),
        cell: ({ row }) =>
            row.original.lastAt ? (
                <span className="whitespace-nowrap" title={formatDateTime(row.original.lastAt)}>
                    {formatRelative(row.original.lastAt)}
                </span>
            ) : (
                <span className="text-muted-foreground">{t('ADMIN_OPERATIONS.COMMON.NEVER')}</span>
            ),
    },
    {
        id: 'trend',
        header: () => label('COLUMNS.TREND'),
        cell: ({ row }) => <TrendBars trend={row.original.trend} />,
    },
];

export default function FeatureUsage({ features }: Props) {
    const hasEvents = features.some(feature => feature.events > 0);

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            {GROUPS.map(group => {
                const rows = features.filter(feature => feature.group === group);

                return (
                    <section key={group} aria-labelledby={`feature-usage-${group}`} className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 id={`feature-usage-${group}`} className="text-base font-medium">
                                {label(`GROUPS.${group}`)}
                            </h2>
                            {group === GROUPS[0] ? <span className="text-muted-foreground text-sm">{label('ACCOUNTS_HINT')}</span> : null}
                        </div>
                        <ListCard
                            table={
                                <ListTable
                                    data={hasEvents ? rows : []}
                                    columns={columns}
                                    getRowId={row => row.key}
                                    empty={
                                        <DataTableEmpty
                                            icon={<ActivityIcon className="size-4" />}
                                            title={label('EMPTY_TITLE')}
                                            description={label('EMPTY_DESCRIPTION')}
                                        />
                                    }
                                />
                            }
                        />
                    </section>
                );
            })}
        </div>
    );
}
