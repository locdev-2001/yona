import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftIcon, UsersIcon } from '@admin/components/icons';

import { formatDateTime } from '@admin/lib/format';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { ListTable } from '@admin/views/datatables/list/list-table';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatNumber, formatRelative } from './operationsFormat';

export type FeatureAccountRow = {
    accountId: number;
    accountName: string | null;
    events: number;
    events30d: number;
    firstAt: string | null;
    lastAt: string | null;
    url: string;
};

type Props = {
    feature: { key: string; label: string; group: string };
    accounts: FeatureAccountRow[];
    limit: number;
    backUrl: string;
};

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.FEATURE_USAGE.ACCOUNTS.${key}`, params);

const NUMERIC = { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right font-num' };

function When({ at }: { at: string | null }) {
    if (!at) return <span className="text-muted-foreground">-</span>;

    return (
        <span className="whitespace-nowrap" title={formatDateTime(at)}>
            {formatRelative(at)}
        </span>
    );
}

const columns: ColumnDef<FeatureAccountRow>[] = [
    {
        id: 'account',
        header: () => label('COLUMNS.ACCOUNT'),
        cell: ({ row }) => (
            <Link href={row.original.url} className="inline-flex min-h-11 min-w-48 flex-col justify-center hover:underline md:min-h-0">
                <span className="font-medium">{row.original.accountName || `#${row.original.accountId}`}</span>
                <span className="text-muted-foreground text-sm">#{row.original.accountId}</span>
            </Link>
        ),
    },
    { id: 'events', header: () => label('COLUMNS.EVENTS'), cell: ({ row }) => formatNumber(row.original.events), meta: NUMERIC },
    { id: 'events30d', header: () => label('COLUMNS.EVENTS_30D'), cell: ({ row }) => formatNumber(row.original.events30d), meta: NUMERIC },
    { id: 'first', header: () => label('COLUMNS.FIRST'), cell: ({ row }) => <When at={row.original.firstAt} /> },
    { id: 'last', header: () => label('COLUMNS.LAST'), cell: ({ row }) => <When at={row.original.lastAt} /> },
];

export default function FeatureUsageAccounts({ feature, accounts, limit, backUrl }: Props) {
    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader
                className="mb-0 md:mb-0"
                eyebrow={
                    <Link href={backUrl} className="text-muted-foreground hover:text-foreground mb-1 inline-flex min-h-11 items-center gap-1 text-sm md:min-h-0">
                        <ArrowLeftIcon className="size-3.5" />
                        {label('BACK')}
                    </Link>
                }
                title={label('TITLE', { feature: feature.label })}
                description={label('DESCRIPTION', { limit: formatNumber(limit) })}
            />

            <ListCard
                table={
                    <ListTable
                        data={accounts}
                        columns={columns}
                        getRowId={row => String(row.accountId)}
                        empty={<DataTableEmpty icon={<UsersIcon className="size-4" />} title={label('EMPTY_TITLE')} description={label('EMPTY_DESCRIPTION')} />}
                    />
                }
            />
        </div>
    );
}
