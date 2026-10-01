import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../i18n';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input, Select } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { formatDateTime, formatRelative, visitWithParams } from './operationsFormat';

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

export function SeverityBadge({ severity, label }: { severity: ChannelHealthItem['severity']; label: string | null }) {
    return <Badge variant={severity === 'warning' ? 'warning' : 'destructive'}>{label}</Badge>;
}

// Chi tiết của driver: số lần lỗi (chuỗi số) hiện thành câu, lý do dạng chữ giữ nguyên.
export function problemDetail(detail: string | null): string | null {
    if (!detail) return null;

    return /^\d+$/.test(detail) ? t('ADMIN_OPERATIONS.CHANNEL_HEALTH.DETAIL_COUNT', { count: Number(detail) }) : detail;
}

export default function ChannelHealth({ stats, items, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const hasFilters = Object.values(filters).some(Boolean);
    const apply = (next: Filters) => visitWithParams(PAGE_URL, { ...filters, ...next });

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        apply({ search });
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.TITLE')}
                description={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.DESCRIPTION')}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.STATS.TOTAL')} value={stats.total} icon="i-lucide-inbox" />
                <StatCard label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.STATS.HEALTHY')} value={stats.healthy} icon="i-lucide-circle-check" />
                <StatCard label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.STATS.FAILING')} value={stats.failing} icon="i-lucide-triangle-alert" />
                <StatCard label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.STATS.ERRORS')} value={stats.errors} icon="i-lucide-circle-x" />
            </div>

            <Card className="gap-0 py-0">
                <div className="flex flex-col gap-3 border-b border-console-border p-4 lg:flex-row lg:items-center">
                    <form onSubmit={submitSearch} className="flex flex-1 gap-2" role="search">
                        <Input
                            type="search"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.SEARCH')}
                            aria-label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.SEARCH')}
                        />
                        <Button type="submit" variant="outline">
                            {t('ADMIN_OPERATIONS.COMMON.APPLY')}
                        </Button>
                    </form>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[36rem]">
                        <Select
                            aria-label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_PROBLEMS')}
                            value={filters.problem ?? ''}
                            onChange={event => apply({ problem: event.target.value })}
                        >
                            <option value="">{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_PROBLEMS')}</option>
                            {options.problems.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label} ({option.count})
                                </option>
                            ))}
                        </Select>
                        <Select
                            aria-label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_PLATFORMS')}
                            value={filters.platform ?? ''}
                            onChange={event => apply({ platform: event.target.value })}
                        >
                            <option value="">{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_PLATFORMS')}</option>
                            {options.platforms.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label} ({option.count})
                                </option>
                            ))}
                        </Select>
                        <Select
                            aria-label={t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_SEVERITIES')}
                            value={filters.severity ?? ''}
                            onChange={event => apply({ severity: event.target.value })}
                        >
                            <option value="">{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.FILTERS.ALL_SEVERITIES')}</option>
                            {SEVERITIES.map(severity => (
                                <option key={severity} value={severity}>
                                    {t(`ADMIN_OPERATIONS.CHANNEL_HEALTH.SEVERITY.${severity}`)}
                                </option>
                            ))}
                        </Select>
                    </div>
                    {hasFilters ? (
                        <Button variant="ghost" onClick={() => visitWithParams(PAGE_URL, {})}>
                            {t('ADMIN_OPERATIONS.COMMON.CLEAR')}
                        </Button>
                    ) : null}
                </div>

                {items.length === 0 ? (
                    <EmptyState
                        icon={hasFilters ? 'i-lucide-search-x' : 'i-lucide-heart-pulse'}
                        title={hasFilters ? t('ADMIN_OPERATIONS.CHANNEL_HEALTH.NO_MATCH') : t('ADMIN_OPERATIONS.CHANNEL_HEALTH.EMPTY_TITLE')}
                        description={hasFilters ? undefined : t('ADMIN_OPERATIONS.CHANNEL_HEALTH.EMPTY_DESCRIPTION')}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.COLUMNS.INBOX')}</TableHead>
                                <TableHead>{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.COLUMNS.ACCOUNT')}</TableHead>
                                <TableHead>{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.COLUMNS.PROBLEM')}</TableHead>
                                <TableHead>{t('ADMIN_OPERATIONS.CHANNEL_HEALTH.COLUMNS.SINCE')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.inboxId}>
                                    <TableCell>
                                        <div className="flex min-w-40 items-center gap-2">
                                            <img src={item.platform.logo_url} alt="" className="size-5 shrink-0 rounded" />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{item.inboxName}</p>
                                                <p className="text-xs text-console-muted-foreground">
                                                    {item.platform.name} · #{item.inboxId}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={item.url} className="font-medium text-console-brand hover:underline">
                                            {item.accountName ?? `#${item.accountId}`}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex min-w-48 flex-col gap-1">
                                            <SeverityBadge severity={item.severity} label={item.problemLabel} />
                                            {problemDetail(item.detail) ? (
                                                <span className="break-words text-xs text-console-muted-foreground">
                                                    {problemDetail(item.detail)}
                                                </span>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap" title={formatDateTime(item.since)}>
                                        {item.since ? formatRelative(item.since) : t('ADMIN_OPERATIONS.COMMON.UNKNOWN')}
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
