import { t } from '../../../i18n';
import { cn } from '../../ui/cn';
import { Icon } from '../../ui/Icon';
import { HorizontalBars, TimeSeriesChart } from '../charts';
import { formatNumber, formatPercent } from '../format';
import type {
    ActivationFunnelData,
    ConversationsByChannelData,
    KpisData,
    MessagesTrendData,
    SignupsTrendData,
} from '../types';

function deltaTone(delta: number): string {
    if (delta > 0) return 'text-console-success-foreground';
    if (delta < 0) return 'text-console-destructive-foreground';

    return 'text-console-muted-foreground';
}

export function Kpis({ data }: { data: KpisData }) {
    return (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-console-border bg-console-border sm:grid-cols-4">
            {data.metrics.map(metric => (
                <div key={metric.key} className="flex flex-col gap-1 bg-console-card p-3">
                    <dt className="text-xs font-medium text-console-muted-foreground">
                        {t(`ADMIN_DASHBOARD.METRICS.${metric.key.toUpperCase()}`)}
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums tracking-tight">{formatNumber(metric.value)}</dd>
                    {metric.changePercent !== null ? (
                        <dd className="flex items-center gap-1 text-xs">
                            <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', deltaTone(metric.changePercent))}>
                                {metric.changePercent > 0 ? <Icon name="i-lucide-trending-up" className="size-3.5" /> : null}
                                {metric.changePercent < 0 ? <Icon name="i-lucide-trending-down" className="size-3.5" /> : null}
                                {metric.changePercent > 0 ? '+' : ''}
                                {formatPercent(metric.changePercent)}%
                            </span>
                            <span className="text-console-muted-foreground">{t('ADMIN_DASHBOARD.RANGE.COMPARED')}</span>
                        </dd>
                    ) : null}
                </div>
            ))}
        </dl>
    );
}

export function MessagesTrend({ data, title }: { data: MessagesTrendData; title: string }) {
    return (
        <TimeSeriesChart
            title={title}
            dates={data.days.map(day => day.date)}
            series={[
                {
                    key: 'incoming',
                    label: t('ADMIN_DASHBOARD.SERIES.INCOMING'),
                    colorClass: 'text-console-brand',
                    values: data.days.map(day => day.incoming),
                },
                {
                    key: 'outgoing',
                    label: t('ADMIN_DASHBOARD.SERIES.OUTGOING'),
                    colorClass: 'text-console-success',
                    values: data.days.map(day => day.outgoing),
                },
            ]}
        />
    );
}

export function SignupsTrend({ data, title }: { data: SignupsTrendData; title: string }) {
    return (
        <TimeSeriesChart
            title={title}
            variant="bar"
            dates={data.days.map(day => day.date)}
            series={[
                {
                    key: 'signups',
                    label: t('ADMIN_DASHBOARD.SERIES.SIGNUPS'),
                    colorClass: 'text-console-brand',
                    values: data.days.map(day => day.count),
                },
            ]}
        />
    );
}

export function ConversationsByChannel({ data }: { data: ConversationsByChannelData }) {
    return (
        <div className="flex flex-col gap-4">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatNumber(data.total)}</p>
            <HorizontalBars
                items={data.items.map(item => ({
                    key: item.channelType ?? item.platform.key,
                    label: item.platform.name,
                    value: item.count,
                }))}
            />
        </div>
    );
}

// Phễu: mỗi bước một thanh, độ rộng theo tỉ lệ so với bước đăng ký.
export function ActivationFunnel({ data, title }: { data: ActivationFunnelData; title: string }) {
    const start = Math.max(1, data.steps[0]?.count ?? 0);

    return (
        <ol aria-label={title} className="flex flex-col gap-2.5">
            {data.steps.map((step, index) => (
                <li key={step.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">{t(`ADMIN_DASHBOARD.FUNNEL_STEPS.${step.key.toUpperCase()}`)}</span>
                        <span className="shrink-0 font-medium tabular-nums">{formatNumber(step.count)}</span>
                    </div>
                    <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full">
                        <rect x={0} y={0} width={100} height={8} rx={2} className="fill-console-accent" />
                        <rect
                            x={0}
                            y={0}
                            width={(step.count / start) * 100}
                            height={8}
                            rx={2}
                            className="fill-console-brand"
                            opacity={1 - index * 0.12}
                        />
                    </svg>
                    {index > 0 ? (
                        <p className="text-xs tabular-nums text-console-muted-foreground">
                            {t('ADMIN_DASHBOARD.FUNNEL.FROM_PREVIOUS', { rate: formatPercent(step.rateFromPrevious) })}
                            {' · '}
                            {t('ADMIN_DASHBOARD.FUNNEL.FROM_START', { rate: formatPercent(step.rateFromStart) })}
                        </p>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}
