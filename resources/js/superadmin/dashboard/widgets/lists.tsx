import { Link } from '@inertiajs/react';

import { t } from '../../../i18n';
import { Badge } from '../../ui/Badge';
import { buttonClassName } from '../../ui/Button';
import { HorizontalBars } from '../charts';
import { formatDateTime, formatNumber } from '../format';
import type { ChannelHealthData, RecentSignupsData, TopAccountsData } from '../types';

export function TopAccounts({ data }: { data: TopAccountsData }) {
    return (
        <HorizontalBars
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                href: item.url,
                value: item.messages,
                valueLabel: t('ADMIN_DASHBOARD.LISTS.MESSAGES', { count: formatNumber(item.messages) }),
            }))}
        />
    );
}

export function RecentSignups({ data }: { data: RecentSignupsData }) {
    return (
        <ul className="-my-2 divide-y divide-console-border">
            {data.items.map(item => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                        <Link href={item.url} className="block truncate font-medium hover:underline">
                            {item.name}
                        </Link>
                        <p className="truncate text-xs text-console-muted-foreground">
                            {item.ownerEmail ?? t('ADMIN_DASHBOARD.LISTS.NO_OWNER')}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-console-muted-foreground">
                        <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                        <span className="tabular-nums">
                            {t('ADMIN_DASHBOARD.LISTS.INBOXES', { count: formatNumber(item.inboxesCount) })}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function ChannelHealth({ data }: { data: ChannelHealthData }) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-end gap-4">
                <div>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-console-destructive-foreground">
                        {formatNumber(data.failing)}
                    </p>
                    <p className="text-xs text-console-muted-foreground">{t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING')}</p>
                </div>
                <div>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-console-success-foreground">
                        {formatNumber(data.healthy)}
                    </p>
                    <p className="text-xs text-console-muted-foreground">{t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}</p>
                </div>
                <p className="ml-auto text-xs tabular-nums text-console-muted-foreground">
                    {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.TOTAL', { count: formatNumber(data.total) })}
                </p>
            </div>
            {data.failing === 0 ? (
                <p className="text-sm text-console-muted-foreground">{t('ADMIN_DASHBOARD.CHANNEL_HEALTH.ALL_HEALTHY')}</p>
            ) : (
                <ul className="-my-2 divide-y divide-console-border">
                    {data.items.map(item => (
                        <li key={item.inboxId} className="flex flex-col gap-1 py-2">
                            <a href={item.url} className="truncate font-medium hover:underline">
                                {item.inboxName}
                            </a>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-console-muted-foreground">
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
            <a href={data.url} className={buttonClassName({ variant: 'link', size: 'sm', className: 'self-start px-0' })}>
                {t('ADMIN_DASHBOARD.ACTIONS.VIEW_ALL')}
            </a>
        </div>
    );
}
