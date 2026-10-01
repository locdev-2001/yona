import { Link } from '@inertiajs/react';

import { Badge } from '@admin/components/ui/badge';
import { Button } from '@admin/components/ui/button';
import { Separator } from '@admin/components/ui/separator';
import { GoalDonut } from '@admin/views/dashboards/charts/chart-sales-metrics';
import TotalEarningList from '@admin/views/dashboards/widgets/widget-total-earning';

import { t } from '../../../i18n';
import { formatDateTime, formatNumber, formatPercent } from '../format';
import type { ChannelHealthData, RecentSignupsData, TopAccountsData } from '../types';

// Hai chữ cái đầu của tên account cho ô vuông đầu dòng.
function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);

    return letters.toUpperCase();
}

const accountLink = (item: { name: string; url: string }) => (
    <Link href={item.url} className="hover:underline">
        {item.name}
    </Link>
);

export function TopAccounts({ data }: { data: TopAccountsData }) {
    const max = Math.max(1, ...data.items.map(item => item.messages));

    return (
        <TotalEarningList
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                title: accountLink(item),
                icon: <span className="text-xs font-medium">{initials(item.name)}</span>,
                value: t('ADMIN_DASHBOARD.LISTS.MESSAGES', { count: formatNumber(item.messages) }),
                progressPercentage: (item.messages / max) * 100,
            }))}
        />
    );
}

export function RecentSignups({ data }: { data: RecentSignupsData }) {
    return (
        <TotalEarningList
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                title: accountLink(item),
                subtitle: item.ownerEmail ?? t('ADMIN_DASHBOARD.LISTS.NO_OWNER'),
                icon: <span className="text-xs font-medium">{initials(item.name)}</span>,
                value: (
                    <span className="flex flex-col items-end gap-0.5">
                        <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                        <span className="text-muted-foreground text-xs">
                            {t('ADMIN_DASHBOARD.LISTS.INBOXES', { count: formatNumber(item.inboxesCount) })}
                        </span>
                    </span>
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
                    { key: 'healthy', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY'), value: data.healthy, color: 'var(--primary)' },
                    { key: 'failing', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING'), value: data.failing, color: 'var(--destructive)' },
                ]}
                centerValue={`${formatNumber(data.healthy)}/${formatNumber(data.total)}`}
                centerLabel={t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}
                footerLabel={t('ADMIN_DASHBOARD.CHANNEL_HEALTH.RATE')}
                footerValue={rate === null ? '-' : `${formatPercent(rate)}%`}
            />
            <Separator />
            {data.failing === 0 ? (
                <p className="text-muted-foreground text-sm">{t('ADMIN_DASHBOARD.CHANNEL_HEALTH.ALL_HEALTHY')}</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {data.items.map(item => (
                        <li key={item.inboxId} className="flex flex-col gap-1">
                            <a href={item.url} className="truncate text-base font-medium hover:underline">
                                {item.inboxName}
                            </a>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                                <Badge variant="destructive">{item.problemLabel}</Badge>
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
