import { Link } from '@inertiajs/react';
import { CircleCheckIcon } from 'lucide-react';

import { formatDate, formatDateTime, initialsOf } from '@admin/lib/format';

import { Badge } from '@admin/components/ui/badge';
import { Button } from '@admin/components/ui/button';
import { Separator } from '@admin/components/ui/separator';
import { GoalDonut } from '@admin/views/dashboards/charts/chart-sales-metrics';
import TotalEarningList from '@admin/views/dashboards/widgets/widget-total-earning';
import { TONE_FILL, toneOf } from '@admin/views/dashboards/tones';

import { t } from '../../../i18n';
import { formatNumber, formatPercent } from '../format';
import type { ChannelHealthData, RecentSignupsData, TopAccountsData } from '../types';

const accountLink = (item: { name: string; url: string }) => (
    <Link href={item.url} className="hover:underline">
        {item.name}
    </Link>
);

const initialsIcon = (name: string) => <span className="text-xs font-medium">{initialsOf(name)}</span>;

export function TopAccounts({ data }: { data: TopAccountsData }) {
    const max = Math.max(1, ...data.items.map(item => item.messages));

    return (
        <TotalEarningList
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                title: accountLink(item),
                icon: initialsIcon(item.name),
                tone: toneOf(item.name),
                value: t('ADMIN_DASHBOARD.LISTS.MESSAGES', { count: formatNumber(item.messages) }),
                progressPercentage: (item.messages / max) * 100,
                progressTone: 'primary',
            }))}
        />
    );
}

// Dòng phụ: số hộp thư, kèm email quản trị viên khi có (không lặp "chưa có" ở từng dòng).
export function RecentSignups({ data }: { data: RecentSignupsData }) {
    return (
        <TotalEarningList
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                title: accountLink(item),
                subtitle: [t('ADMIN_DASHBOARD.LISTS.INBOXES', { count: formatNumber(item.inboxesCount) }), item.ownerEmail]
                    .filter(Boolean)
                    .join(' · '),
                icon: initialsIcon(item.name),
                tone: toneOf(item.name),
                value: (
                    <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)}>
                        {formatDate(item.createdAt)}
                    </time>
                ),
            }))}
        />
    );
}

// Kiểu thẻ "mục tiêu": vành khuyên khoẻ/có vấn đề, dòng tỉ lệ, rồi danh sách hộp thư lỗi.
export function ChannelHealth({ data }: { data: ChannelHealthData }) {
    const rate = data.total === 0 ? null : (data.healthy / data.total) * 100;

    return (
        <div className="flex flex-1 flex-col gap-4">
            <GoalDonut
                title={t('ADMIN_DASHBOARD.WIDGETS.CHANNEL_HEALTH.TITLE')}
                slices={[
                    { key: 'healthy', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY'), value: data.healthy, color: TONE_FILL.success },
                    { key: 'failing', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING'), value: data.failing, color: TONE_FILL.danger },
                ]}
                centerValue={`${formatNumber(data.healthy)}/${formatNumber(data.total)}`}
                centerLabel={t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}
                footerLabel={t('ADMIN_DASHBOARD.CHANNEL_HEALTH.RATE')}
                footerValue={rate === null ? '-' : `${formatPercent(rate)}%`}
                footerClassName={rate === null ? undefined : data.failing === 0 ? 'text-success' : 'text-danger'}
                legend={
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                        <li className="flex items-center gap-2">
                            <span className="bg-success size-2.5 shrink-0" aria-hidden="true" />
                            {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}
                            <span className="font-num text-neutral-900">{formatNumber(data.healthy)}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="bg-danger size-2.5 shrink-0" aria-hidden="true" />
                            {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING')}
                            <span className="font-num text-neutral-900">{formatNumber(data.failing)}</span>
                        </li>
                    </ul>
                }
            />
            <Separator />
            {data.failing === 0 ? (
                <p className="bg-success-tint text-success flex items-center gap-2 px-3 py-2 text-sm">
                    <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                    {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.ALL_HEALTHY')}
                </p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {data.items.map(item => (
                        <li key={item.inboxId} className="flex flex-col gap-1">
                            <a href={item.url} className="truncate text-base font-medium hover:underline">
                                {item.inboxName}
                            </a>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                                <Badge className="bg-danger-tint text-danger rounded-sm border-none">{item.problemLabel}</Badge>
                                <span className="truncate">
                                    {item.platform.name}
                                    {item.accountName ? ` · ${item.accountName}` : ''}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <Button variant="link" size="sm" className="mt-auto self-start px-0" render={<a href={data.url} />} nativeButton={false}>
                {t('ADMIN_DASHBOARD.ACTIONS.VIEW_ALL')}
            </Button>
        </div>
    );
}
