import { ActivityIcon, KanbanIcon, LayersIcon, LinkIcon, ScrollTextIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@admin/components/ui/button';
import StatusBadge, { type StatusTone } from '@admin/views/datatables/status-badge';
import { MEANING_TONE } from '@admin/views/dashboards/tones';
import ProductInsightsStats from '@admin/views/dashboards/widgets/widget-product-insights';
import QuickLinks from '@admin/views/dashboards/widgets/widget-quick-links';

import { t } from '../../../i18n';
import { formatBytes, formatNumber } from '../format';
import type { OperationLink, QueueHealthData, StickersData, SystemData } from '../types';

// Trạng thái hàng đợi theo màu trạng thái chuẩn; chữ trong nhãn nói rõ nên không chỉ dựa vào màu.
const QUEUE_TONE: Record<QueueHealthData['status'], StatusTone> = {
    running: 'success',
    paused: 'warning',
    inactive: 'danger',
    unavailable: 'neutral',
};

const numberOrDash = (value: number | null) => (value === null ? '-' : formatNumber(value));

function OpenLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Button variant="link" size="sm" className="mt-auto self-start px-0" render={<a href={href} />} nativeButton={false}>
            {children}
        </Button>
    );
}

// Ba ô cuối cùng một khuôn: dòng nhãn trái, số phải, liên kết ở đáy.
export function QueueHealth({ data }: { data: QueueHealthData }) {
    return (
        <div className="flex flex-1 flex-col gap-4">
            <StatusBadge tone={QUEUE_TONE[data.status]} className="self-start">
                {t(`ADMIN_DASHBOARD.QUEUE.STATUS.${data.status.toUpperCase()}`)}
            </StatusBadge>
            <ProductInsightsStats
                stats={[
                    { key: 'pending', label: t('ADMIN_DASHBOARD.QUEUE.PENDING'), value: numberOrDash(data.pendingJobs) },
                    {
                        key: 'failed',
                        label: t('ADMIN_DASHBOARD.QUEUE.RECENT_FAILED'),
                        value: numberOrDash(data.recentFailedJobs),
                        className: (data.recentFailedJobs ?? 0) > 0 ? 'text-danger' : undefined,
                    },
                    { key: 'processes', label: t('ADMIN_DASHBOARD.QUEUE.PROCESSES'), value: numberOrDash(data.processes) },
                ]}
            />
            <OpenLink href={data.url}>{t('ADMIN_DASHBOARD.QUEUE.OPEN')}</OpenLink>
        </div>
    );
}

export function Stickers({ data }: { data: StickersData }) {
    return (
        <div className="flex flex-1 flex-col gap-4">
            <ProductInsightsStats
                stats={[
                    { key: 'packs', label: t('ADMIN_DASHBOARD.STICKERS.SHARED_PACKS'), value: formatNumber(data.sharedPacks) },
                    { key: 'published', label: t('ADMIN_DASHBOARD.STICKERS.SHARED_PUBLISHED'), value: formatNumber(data.sharedPublishedPacks) },
                    { key: 'shared', label: t('ADMIN_DASHBOARD.STICKERS.SHARED_STICKERS'), value: formatNumber(data.sharedStickers) },
                    { key: 'accounts', label: t('ADMIN_DASHBOARD.STICKERS.PRIVATE_ACCOUNTS'), value: formatNumber(data.accountsWithPrivateLibrary) },
                    { key: 'private', label: t('ADMIN_DASHBOARD.STICKERS.PRIVATE_STICKERS'), value: formatNumber(data.privateStickers) },
                ]}
            />
            <OpenLink href={data.url}>{t('ADMIN_DASHBOARD.STICKERS.OPEN')}</OpenLink>
        </div>
    );
}

export function System({ data }: { data: SystemData }) {
    return (
        <ProductInsightsStats
            stats={[
                { key: 'version', numeric: false, label: t('ADMIN_DASHBOARD.SYSTEM.VERSION'), value: data.version || '-' },
                { key: 'environment', numeric: false, label: t('ADMIN_DASHBOARD.SYSTEM.ENVIRONMENT'), value: data.environment },
                { key: 'php', numeric: false, label: t('ADMIN_DASHBOARD.SYSTEM.PHP'), value: data.php },
                { key: 'laravel', numeric: false, label: t('ADMIN_DASHBOARD.SYSTEM.LARAVEL'), value: data.laravel },
                { key: 'size', label: t('ADMIN_DASHBOARD.SYSTEM.DATABASE_SIZE'), value: formatBytes(data.databaseSizeBytes) },
                { key: 'tables', label: t('ADMIN_DASHBOARD.SYSTEM.TABLES'), value: formatNumber(data.tablesCount) },
            ]}
        />
    );
}

const LINK_ICON: Record<string, ReactNode> = {
    horizon: <LayersIcon className="size-5" />,
    pulse: <ActivityIcon className="size-5" />,
    logs: <ScrollTextIcon className="size-5" />,
    tasks: <KanbanIcon className="size-5" />,
};

export function OperationLinks({ links }: { links: OperationLink[] }) {
    return (
        <QuickLinks
            links={links.map(link => ({
                key: link.key,
                href: link.url,
                external: link.external,
                icon: LINK_ICON[link.key] ?? <LinkIcon className="size-5" />,
                // Lối tắt vận hành đều thuộc họ "hệ thống": cùng một màu trung tính, không tô theo thứ tự.
                tone: MEANING_TONE.system,
                title: t(`ADMIN_DASHBOARD.LINKS.${link.key.toUpperCase()}.TITLE`),
                description: t(`ADMIN_DASHBOARD.LINKS.${link.key.toUpperCase()}.DESCRIPTION`),
            }))}
        />
    );
}
