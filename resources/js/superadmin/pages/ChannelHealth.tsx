import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheckIcon, CircleXIcon, HeartPulseIcon, InboxIcon, SearchXIcon, TriangleAlertIcon, XIcon } from '@admin/components/icons';
import { useId, useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@admin/components/ui/avatar';
import { formatDateTime, initialsOf } from '@admin/lib/format';
import { Button } from '@admin/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@admin/components/ui/tooltip';
import DataTableEmpty from '@admin/views/datatables/datatable-empty';
import ListCard from '@admin/views/datatables/list';
import { FilterSelect } from '@admin/views/datatables/list/list-filters';
import { ListTable } from '@admin/views/datatables/list/list-table';
import { ListToolbar } from '@admin/views/datatables/list/list-toolbar';
import StatisticsCard from '@admin/views/datatables/statistics-card';
import StatusBadge from '@admin/views/datatables/status-badge';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { formatNumber, formatRelative, visitWithParams } from './operationsFormat';

export type ChannelHealthItem = {
    inboxId: number;
    inboxName: string;
    accountId: number;
    accountName: string | null;
    channelType: string;
    platform: { key: string; name: string; logo_url: string };
    healthy: boolean;
    problem: string | null;
    severity: 'error' | 'warning' | null;
    problemLabel: string | null;
    detail: string | null;
    since: string | null;
    url: string;
};

type Option = { value: string; label: string; count: number };

type Filters = Partial<Record<'problem' | 'platform' | 'severity' | 'search', string>>;

type Props = {
    stats: { total: number; healthy: number; failing: number; errors: number };
    items: ChannelHealthItem[];
    filters: Filters;
    options: { problems: Option[]; platforms: Option[] };
};

const PAGE_URL = '/admin/channel_health';
const SEVERITIES = ['error', 'warning'] as const;

const label = (key: string, params?: Record<string, string | number>) => t(`ADMIN_OPERATIONS.CHANNEL_HEALTH.${key}`, params);

export function SeverityBadge({ severity, label: text }: { severity: ChannelHealthItem['severity']; label: string | null }) {
    return <StatusBadge tone={severity === 'warning' ? 'warning' : 'danger'}>{text}</StatusBadge>;
}

// Chi tiết của driver: số lần lỗi (chuỗi số) hiện thành câu, lý do dạng chữ giữ nguyên.
export function problemDetail(detail: string | null): string | null {
    if (!detail) return null;

    return /^\d+$/.test(detail) ? t('ADMIN_OPERATIONS.CHANNEL_HEALTH.DETAIL_COUNT', { count: Number(detail) }) : detail;
}

const columns: ColumnDef<ChannelHealthItem>[] = [
    {
        id: 'inbox',
        header: () => label('COLUMNS.INBOX'),
        cell: ({ row }) => (
            <div className="flex min-w-0 max-w-full items-center gap-2">
                <Avatar className="size-9 rounded-sm after:rounded-sm">
                    <AvatarImage src={row.original.platform.logo_url} alt="" className="rounded-sm" />
                    <AvatarFallback className="rounded-sm text-xs">{initialsOf(row.original.platform.name)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{row.original.inboxName}</span>
                    <span className="text-muted-foreground">
                        {row.original.platform.name} · #{row.original.inboxId}
                    </span>
                </div>
            </div>
        ),
    },
    {
        id: 'account',
        header: () => label('COLUMNS.ACCOUNT'),
        cell: ({ row }) => (
            <Link href={row.original.url} className="font-medium hover:underline">
                {row.original.accountName ?? `#${row.original.accountId}`}
            </Link>
        ),
    },
    {
        id: 'problem',
        header: () => label('COLUMNS.PROBLEM'),
        cell: ({ row }) => {
            const detail = problemDetail(row.original.detail);

            return (
                <div className="flex min-w-0 max-w-full flex-col items-start gap-1 py-2 whitespace-normal">
                    <SeverityBadge severity={row.original.severity} label={row.original.problemLabel} />
                    {detail ? <span className="text-muted-foreground break-words">{detail}</span> : null}
                </div>
            );
        },
    },
    {
        id: 'since',
        header: () => label('COLUMNS.SINCE'),
        cell: ({ row }) =>
            row.original.since ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="whitespace-nowrap" />}>{formatRelative(row.original.since)}</TooltipTrigger>
                    <TooltipContent>{formatDateTime(row.original.since)}</TooltipContent>
                </Tooltip>
            ) : (
                <span className="text-muted-foreground">{t('ADMIN_OPERATIONS.COMMON.UNKNOWN')}</span>
            ),
    },
];

export default function ChannelHealth({ stats, items, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const ids = { problem: useId(), platform: useId(), severity: useId(), search: useId() };
    const hasFilters = Object.values(filters).some(Boolean);
    const apply = (next: Filters) => visitWithParams(PAGE_URL, { ...filters, ...next });
    const optionItems = (list: Option[]) => list.map(option => ({ value: option.value, label: `${option.label} (${option.count})` }));
    const severityItems = useMemo(() => SEVERITIES.map(severity => ({ value: severity, label: label(`SEVERITY.${severity}`) })), []);

    return (
        <div className="grid grid-cols-1 gap-6">
            <PageHeader title={label('TITLE')} description={label('DESCRIPTION')} className="mb-0 md:mb-0" />

            <div className="grid grid-cols-2 gap-4 lg:gap-6 xl:grid-cols-4">
                <StatisticsCard icon={<InboxIcon className="size-4" />} value={formatNumber(stats.total)} title={label('STATS.TOTAL')} tone="cyan" />
                <StatisticsCard icon={<CircleCheckIcon className="size-4" />} value={formatNumber(stats.healthy)} title={label('STATS.HEALTHY')} tone="success" />
                <StatisticsCard icon={<TriangleAlertIcon className="size-4" />} value={formatNumber(stats.failing)} title={label('STATS.FAILING')} tone={stats.failing > 0 ? 'warning' : 'neutral'} />
                <StatisticsCard icon={<CircleXIcon className="size-4" />} value={formatNumber(stats.errors)} title={label('STATS.ERRORS')} tone={stats.errors > 0 ? 'danger' : 'neutral'} />
            </div>

            <ListCard
                toolbar={
                    <ListToolbar
                        search={{
                            id: ids.search,
                            label: label('FILTERS.SEARCH'),
                            placeholder: label('FILTERS.SEARCH'),
                            value: search,
                            onChange: setSearch,
                            onSubmit: () => apply({ search }),
                            onClear: () => apply({ search: '' }),
                        }}
                        filters={
                            <>
                                <FilterSelect
                                    inline
                                    id={ids.problem}
                                    label={label('COLUMNS.PROBLEM')}
                                    allLabel={label('FILTERS.ALL_PROBLEMS')}
                                    options={optionItems(options.problems)}
                                    value={filters.problem ?? ''}
                                    onChange={value => apply({ problem: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.platform}
                                    label={label('FILTERS.PLATFORM')}
                                    allLabel={label('FILTERS.ALL_PLATFORMS')}
                                    options={optionItems(options.platforms)}
                                    value={filters.platform ?? ''}
                                    onChange={value => apply({ platform: value })}
                                />
                                <FilterSelect
                                    inline
                                    id={ids.severity}
                                    label={label('FILTERS.SEVERITY')}
                                    allLabel={label('FILTERS.ALL_SEVERITIES')}
                                    options={severityItems}
                                    value={filters.severity ?? ''}
                                    onChange={value => apply({ severity: value })}
                                />
                            </>
                        }
                    >
                        {hasFilters ? (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    visitWithParams(PAGE_URL, {});
                                }}
                            >
                                <XIcon />
                                {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                            </Button>
                        ) : null}
                    </ListToolbar>
                }
                table={
                    <ListTable
                        data={items}
                        columns={columns}
                        getRowId={item => String(item.inboxId)}
                        empty={
                            hasFilters ? (
                                <DataTableEmpty icon={<SearchXIcon className="size-4" />} title={label('NO_MATCH')} />
                            ) : (
                                <DataTableEmpty
                                    icon={<HeartPulseIcon className="size-4" />}
                                    title={label('EMPTY_TITLE')}
                                    description={label('EMPTY_DESCRIPTION')}
                                />
                            )
                        }
                    />
                }
            />
        </div>
    );
}
