import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ActivityIcon } from '@admin/components/icons';

import { EMPTY_VALUE, formatDateTime } from '@admin/lib/format';
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

// Số lượt mỗi ngày trong 30 ngày: cột cho ngày có lượt, đứng trên một đường nền.
// Ngày 0 lượt để trống, nên hàng toàn 0 chỉ còn đường nền, không trông như có dữ liệu.
export function TrendBars({ trend }: { trend: number[] }) {
    const max = Math.max(1, ...trend);
    const total = trend.reduce((sum, count) => sum + count, 0);

    return (
        <div
            role="img"
            aria-label={label('TREND_SUMMARY', { count: formatNumber(total) })}
            className="flex h-8 w-32 items-stretch gap-px border-b border-neutral-300"
        >
            {trend.map((count, index) => (
                <span key={index} className="flex min-w-0 flex-1 flex-col justify-end">
                    {count > 0 ? <span className="bg-primary-600 w-full" style={{ height: `${Math.max(12, (count / max) * 100)}%` }} /> : null}
                </span>
            ))}
        </div>
    );
}

const isUsed = (row: FeatureRow) => row.accounts.all > 0 || row.events > 0;

// Tính năng có người dùng lên đầu, nhiều tài khoản dùng gần đây trước.
export function rankFeatures(rows: FeatureRow[]): FeatureRow[] {
    return rows
        .filter(isUsed)
        .sort((a, b) => b.accounts['30d'] - a.accounts['30d'] || b.accounts.all - a.accounts.all || b.events - a.events);
}

const accountsColumn = (window: '7d' | '30d' | '90d' | 'all'): ColumnDef<FeatureRow> => ({
    id: `accounts_${window}`,
    header: () => label(`COLUMNS.ACCOUNTS_${window.toUpperCase()}`),
    cell: ({ row }) => (
        <span className={cn(row.original.accounts[window] === 0 && 'text-muted-foreground')}>{formatNumber(row.original.accounts[window])}</span>
    ),
    // Điện thoại chỉ giữ 30 ngày và từ đầu, thẻ mỗi tính năng bớt hai cặp số.
    meta: window === '7d' || window === '90d' ? { ...NUMERIC, mobileHidden: true } : NUMERIC,
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
        meta: { headerClassName: 'pl-8', cellClassName: 'pl-8' },
        cell: ({ row }) =>
            row.original.lastAt ? (
                <span className="whitespace-nowrap" title={formatDateTime(row.original.lastAt)}>
                    {formatRelative(row.original.lastAt)}
                </span>
            ) : (
                <span className="text-muted-foreground">{EMPTY_VALUE}</span>
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
                const all = features.filter(feature => feature.group === group);
                // Mốc kích hoạt giữ thứ tự phễu; tính năng chưa ai dùng gom thành một dòng dưới bảng.
                const rows = group === 'activation' ? all : rankFeatures(all);
                const unused = group === 'activation' ? [] : all.filter(feature => !isUsed(feature));

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
                        {hasEvents && unused.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                <h3 className="text-muted-foreground text-sm">{label('UNUSED_TITLE', { count: unused.length })}</h3>
                                <ul className="flex flex-wrap gap-2">
                                    {unused.map(feature => (
                                        <li key={feature.key}>
                                            <Link
                                                href={feature.url}
                                                aria-label={label('OPEN', { feature: feature.label })}
                                                className="inline-flex min-h-11 items-center rounded-sm border px-3 text-sm hover:bg-neutral-50 active:scale-[0.97] md:min-h-8"
                                            >
                                                {feature.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </section>
                );
            })}
        </div>
    );
}
