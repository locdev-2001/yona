import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive as ArchiveIcon, ServerIcon } from '@admin/components/icons';

import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { ListTable } from '@admin/views/datatables/list/list-table';
import StatisticsCard from '@admin/views/datatables/statistics-card';
import { SectionCard } from '@admin/views/apps/resources/view/section-card';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatBytes, formatNumber } from './operationsFormat';

export type StorageCategory = 'image' | 'video' | 'audio' | 'file' | 'sticker';

export type StorageBreakdownData = {
    totalBytes: number;
    categories: Record<StorageCategory, number>;
    files: number;
};

type AccountRow = { id: number; name: string; url: string; usage: StorageBreakdownData };

type Props = {
    system: StorageBreakdownData;
    disk: { freeBytes: number | null; totalBytes: number | null };
    accounts: AccountRow[];
    categories: StorageCategory[];
    limit: number;
};

export const STORAGE_CATEGORIES: StorageCategory[] = ['image', 'video', 'audio', 'file', 'sticker'];

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.STORAGE.${key}`, params);

const NUMERIC = { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right font-num' };

// Dung lượng theo loại tệp: mỗi loại một dòng, thanh dài theo tỉ lệ trên tổng.
export function StorageBreakdown({ usage }: { usage: StorageBreakdownData }) {
    return (
        <dl className="grid gap-2">
            {STORAGE_CATEGORIES.map(category => {
                const bytes = usage.categories[category] ?? 0;
                const share = usage.totalBytes > 0 ? (bytes / usage.totalBytes) * 100 : 0;

                return (
                    <div key={category} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                        <dt className="text-muted-foreground">{label(`CATEGORIES.${category}`)}</dt>
                        <div className="h-2 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                            {bytes > 0 ? <div className="bg-primary-600 h-full rounded-full" style={{ width: `${Math.max(2, share)}%` }} /> : null}
                        </div>
                        <dd className="font-num text-right tabular-nums">{formatBytes(bytes)}</dd>
                    </div>
                );
            })}
        </dl>
    );
}

const columns: ColumnDef<AccountRow>[] = [
    {
        id: 'account',
        header: () => label('COLUMNS.ACCOUNT'),
        cell: ({ row }) => (
            <Link href={row.original.url} className="inline-flex min-h-11 min-w-0 max-w-full items-center font-medium hover:underline md:min-h-0">
                <span className="truncate">{row.original.name}</span>
            </Link>
        ),
    },
    {
        id: 'total',
        header: () => label('COLUMNS.TOTAL'),
        cell: ({ row }) => <span className="font-medium">{formatBytes(row.original.usage.totalBytes)}</span>,
        meta: NUMERIC,
    },
    ...STORAGE_CATEGORIES.map(
        (category): ColumnDef<AccountRow> => ({
            id: category,
            header: () => label(`CATEGORIES.${category}`),
            cell: ({ row }) => {
                const bytes = row.original.usage.categories[category] ?? 0;
                return <span className={bytes === 0 ? 'text-muted-foreground' : undefined}>{formatBytes(bytes)}</span>;
            },
            meta: { ...NUMERIC, mobileHidden: true },
        }),
    ),
    {
        id: 'files',
        header: () => label('COLUMNS.FILES'),
        cell: ({ row }) => formatNumber(row.original.usage.files),
        meta: NUMERIC,
    },
];

export default function StorageUsage({ system, disk, accounts, limit }: Props) {
    const diskKnown = disk.freeBytes !== null && disk.totalBytes !== null;

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
                <StatisticsCard
                    icon={<ArchiveIcon className="size-4" />}
                    value={formatBytes(system.totalBytes)}
                    title={label('TOTAL')}
                    description={label('FILES', { count: formatNumber(system.files) })}
                    tone="cyan"
                />
                <StatisticsCard
                    icon={<ServerIcon className="size-4" />}
                    value={diskKnown ? formatBytes(disk.freeBytes ?? 0) : '—'}
                    title={label('DISK_FREE')}
                    description={diskKnown ? label('DISK_OF', { total: formatBytes(disk.totalBytes ?? 0) }) : label('DISK_UNKNOWN')}
                    tone={diskKnown && (disk.freeBytes ?? 0) / (disk.totalBytes || 1) < 0.1 ? 'danger' : 'neutral'}
                />
            </div>

            <SectionCard title={label('TOTAL')}>
                <StorageBreakdown usage={system} />
            </SectionCard>

            <section aria-labelledby="storage-ranking" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="storage-ranking" className="text-base font-medium">
                        {label('RANKING')}
                    </h2>
                    <span className="text-muted-foreground text-sm">{label('RANKING_HINT', { limit })}</span>
                </div>
                <ListCard
                    table={
                        <ListTable
                            data={accounts}
                            columns={columns}
                            getRowId={row => String(row.id)}
                            empty={
                                <DataTableEmpty
                                    icon={<ArchiveIcon className="size-4" />}
                                    title={label('EMPTY_TITLE')}
                                    description={label('EMPTY_DESCRIPTION')}
                                />
                            }
                        />
                    }
                />
            </section>
        </div>
    );
}
