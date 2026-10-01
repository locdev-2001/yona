import { t } from '../../../i18n';
import { Badge } from '../../ui/Badge';
import type { BadgeVariant } from '../../ui/Badge';
import { buttonClassName } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { formatBytes, formatNumber } from '../format';
import type { OperationLink, QueueHealthData, StickersData, SystemData } from '../types';

function Facts({ rows }: { rows: { label: string; value: string }[] }) {
    return (
        <dl className="-my-1.5 divide-y divide-console-border">
            {rows.map(row => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-console-muted-foreground">{row.label}</dt>
                    <dd className="truncate text-right font-medium tabular-nums">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

const QUEUE_BADGE: Record<QueueHealthData['status'], BadgeVariant> = {
    running: 'success',
    paused: 'warning',
    inactive: 'destructive',
    unavailable: 'secondary',
};

const numberOrDash = (value: number | null) => (value === null ? '—' : formatNumber(value));

export function QueueHealth({ data }: { data: QueueHealthData }) {
    return (
        <div className="flex flex-col gap-3">
            <Badge variant={QUEUE_BADGE[data.status]}>{t(`ADMIN_DASHBOARD.QUEUE.STATUS.${data.status.toUpperCase()}`)}</Badge>
            <Facts
                rows={[
                    { label: t('ADMIN_DASHBOARD.QUEUE.PENDING'), value: numberOrDash(data.pendingJobs) },
                    { label: t('ADMIN_DASHBOARD.QUEUE.RECENT_FAILED'), value: numberOrDash(data.recentFailedJobs) },
                    { label: t('ADMIN_DASHBOARD.QUEUE.PROCESSES'), value: numberOrDash(data.processes) },
                ]}
            />
            <a href={data.url} className={buttonClassName({ variant: 'link', size: 'sm', className: 'self-start px-0' })}>
                {t('ADMIN_DASHBOARD.QUEUE.OPEN')}
            </a>
        </div>
    );
}

export function Stickers({ data }: { data: StickersData }) {
    return (
        <div className="flex flex-col gap-3">
            <Facts
                rows={[
                    { label: t('ADMIN_DASHBOARD.STICKERS.SHARED_PACKS'), value: formatNumber(data.sharedPacks) },
                    { label: t('ADMIN_DASHBOARD.STICKERS.SHARED_PUBLISHED'), value: formatNumber(data.sharedPublishedPacks) },
                    { label: t('ADMIN_DASHBOARD.STICKERS.SHARED_STICKERS'), value: formatNumber(data.sharedStickers) },
                    { label: t('ADMIN_DASHBOARD.STICKERS.PRIVATE_ACCOUNTS'), value: formatNumber(data.accountsWithPrivateLibrary) },
                    { label: t('ADMIN_DASHBOARD.STICKERS.PRIVATE_STICKERS'), value: formatNumber(data.privateStickers) },
                ]}
            />
            <a href={data.url} className={buttonClassName({ variant: 'link', size: 'sm', className: 'self-start px-0' })}>
                {t('ADMIN_DASHBOARD.STICKERS.OPEN')}
            </a>
        </div>
    );
}

export function System({ data }: { data: SystemData }) {
    return (
        <Facts
            rows={[
                { label: t('ADMIN_DASHBOARD.SYSTEM.VERSION'), value: data.version || '—' },
                { label: t('ADMIN_DASHBOARD.SYSTEM.ENVIRONMENT'), value: data.environment },
                { label: t('ADMIN_DASHBOARD.SYSTEM.PHP'), value: data.php },
                { label: t('ADMIN_DASHBOARD.SYSTEM.LARAVEL'), value: data.laravel },
                { label: t('ADMIN_DASHBOARD.SYSTEM.DATABASE_SIZE'), value: formatBytes(data.databaseSizeBytes) },
                { label: t('ADMIN_DASHBOARD.SYSTEM.TABLES'), value: formatNumber(data.tablesCount) },
            ]}
        />
    );
}

const LINK_ICON: Record<string, string> = {
    horizon: 'i-lucide-layers',
    pulse: 'i-lucide-activity',
    logs: 'i-lucide-scroll-text',
    tasks: 'i-lucide-kanban',
};

export function OperationLinks({ links }: { links: OperationLink[] }) {
    return (
        <ul className="-mx-2 flex flex-col">
            {links.map(link => (
                <li key={link.key}>
                    <a
                        href={link.url}
                        {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="flex items-center gap-3 rounded-md px-2 py-2 outline-none hover:bg-console-accent focus-visible:ring-2 focus-visible:ring-console-ring/50"
                    >
                        <span className="flex size-8 items-center justify-center rounded-md bg-console-accent text-console-muted-foreground">
                            <Icon name={LINK_ICON[link.key] ?? 'i-lucide-link'} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{t(`ADMIN_DASHBOARD.LINKS.${link.key.toUpperCase()}.TITLE`)}</span>
                            <span className="block truncate text-xs text-console-muted-foreground">
                                {t(`ADMIN_DASHBOARD.LINKS.${link.key.toUpperCase()}.DESCRIPTION`)}
                            </span>
                        </span>
                        {link.external ? <Icon name="i-lucide-external-link" className="text-console-muted-foreground" /> : null}
                    </a>
                </li>
            ))}
        </ul>
    );
}
