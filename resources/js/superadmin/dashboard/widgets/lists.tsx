import { Link } from '@inertiajs/react';

import { formatDate, formatDateTime } from '@admin/lib/format';
import GeneratedAvatar from 'shared/avatar/GeneratedAvatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';

import { Button } from '@admin/components/ui/button';
import { Separator } from '@admin/components/ui/separator';
import { DesignDonut as GoalDonut } from '../../design-preview/chart-components';
import TotalEarningList from '@admin/views/dashboards/widgets/widget-total-earning';
import StatusBadge from '@admin/views/datatables/status-badge';
import { MEANING_TONE, TONE_FILL } from '@admin/views/dashboards/tones';

import { t } from '../../../i18n';
import { formatNumber } from '../format';
import type { ChannelHealthData, RecentSignupsData, TopAccountsData } from '../types';

const accountLink = (item: { name: string; url: string }) => (
    <Link href={item.url} className="hover:underline">
        {item.name}
    </Link>
);

// Avatar hình khối của tài khoản: cùng định danh với mọi màn console khác.
const accountAvatar = (item: { id: number; name: string }) => (
    <GeneratedAvatar seed={avatarSeed('account', item.id)} name={item.name} className="size-full" />
);
const ACCOUNT_AVATAR_CLASS = 'overflow-hidden bg-transparent';

export function TopAccounts({ data }: { data: TopAccountsData }) {
    const max = Math.max(1, ...data.items.map(item => item.messages));

    return (
        <TotalEarningList
            items={data.items.map(item => ({
                key: String(item.id),
                label: item.name,
                title: accountLink(item),
                icon: accountAvatar(item),
                avatarClassName: ACCOUNT_AVATAR_CLASS,
                value: t('ADMIN_DASHBOARD.LISTS.MESSAGES', { count: formatNumber(item.messages) }),
                progressPercentage: (item.messages / max) * 100,
                progressTone: MEANING_TONE.messages,
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
                icon: accountAvatar(item),
                avatarClassName: ACCOUNT_AVATAR_CLASS,
                value: (
                    <time dateTime={item.createdAt} title={formatDateTime(item.createdAt)} className="font-sans">
                        {formatDate(item.createdAt)}
                    </time>
                ),
            }))}
        />
    );
}

// Vành khuyên khoẻ / có vấn đề với chú giải số, rồi danh sách hộp thư có vấn đề (nếu có).
// Khoẻ = success, có vấn đề = warning, ngừng nhận tin = danger: cùng màu với trang Sức khoẻ kênh.
export function ChannelHealth({ data }: { data: ChannelHealthData }) {
    const failingTone = MEANING_TONE.problem;

    return (
        <div className="flex flex-1 flex-col gap-4">
            <GoalDonut
                title={t('ADMIN_DASHBOARD.WIDGETS.CHANNEL_HEALTH.TITLE')}
                slices={[
                    { key: 'healthy', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY'), value: data.healthy, color: TONE_FILL[MEANING_TONE.healthy] },
                    { key: 'failing', label: t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING'), value: data.failing, color: TONE_FILL[failingTone] },
                ]}
                centerValue={`${formatNumber(data.healthy)}/${formatNumber(data.total)}`}
                centerLabel={t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}
                legend={
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700">
                        <li className="flex items-center gap-2">
                            <span className="bg-success size-2.5 shrink-0" aria-hidden="true" />
                            {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.HEALTHY')}
                            <span className="font-num text-neutral-900">{formatNumber(data.healthy)}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            {/* Không có vấn đề thì ô màu trung tính: số 0 không phát tín hiệu cảnh báo. */}
                            <span className={data.failing > 0 ? 'bg-warning size-2.5 shrink-0' : 'size-2.5 shrink-0 bg-neutral-300'} aria-hidden="true" />
                            {t('ADMIN_DASHBOARD.CHANNEL_HEALTH.FAILING')}
                            <span className="font-num text-neutral-900">{formatNumber(data.failing)}</span>
                        </li>
                    </ul>
                }
            />
            {data.failing > 0 ? (
                <>
                    <Separator />
                    <ul className="flex flex-col gap-3">
                        {data.items.map(item => (
                            <li key={item.inboxId} className="flex flex-col gap-1">
                                <a href={item.url} className="truncate text-base font-medium hover:underline">
                                    {item.inboxName}
                                </a>
                                <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                                    <StatusBadge tone={item.severity === 'warning' ? 'warning' : 'danger'}>{item.problemLabel}</StatusBadge>
                                    <span className="truncate">
                                        {item.platform.name}
                                        {item.accountName ? ` · ${item.accountName}` : ''}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}
            <Button variant="link" size="sm" className="mt-auto self-start px-0" render={<a href={data.url} />} nativeButton={false}>
                {t('ADMIN_DASHBOARD.ACTIONS.VIEW_ALL')}
            </Button>
        </div>
    );
}
