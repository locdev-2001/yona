import {
    ActivityIcon,
    ArrowDownLeftIcon,
    ArrowUpRightIcon,
    Building2Icon,
    CalendarArrowUpIcon,
    InboxIcon,
    MessagesSquareIcon,
    RepeatIcon,
    SigmaIcon,
    UserPlusIcon,
    UsersIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { CardContent } from '@admin/components/ui/card';
import { Separator } from '@admin/components/ui/separator';
import TimeSeriesChart, { GoalDonut, InsetCard, MetricBoxes } from '@admin/views/dashboards/charts/chart-sales-metrics';
import type { ChartSeries } from '@admin/views/dashboards/charts/chart-sales-metrics';
import StatisticsCard from '@admin/views/dashboards/statistics/statistics-card-01';
import FunnelProgress from '@admin/views/dashboards/widgets/widget-funnel';
import ProductInsightsStats from '@admin/views/dashboards/widgets/widget-product-insights';

import { t } from '../../../i18n';
import { formatDay, formatNumber, formatPercent } from '../format';
import type {
    ActivationFunnelData,
    ConversationsByChannelData,
    FunnelStep,
    KpisData,
    MessagesTrendData,
    SignupsTrendData,
} from '../types';

const KPI_ICON: Record<string, ReactNode> = {
    accounts_total: <Building2Icon className="size-4" />,
    accounts_new: <UserPlusIcon className="size-4" />,
    accounts_active: <ActivityIcon className="size-4" />,
    users_total: <UsersIcon className="size-4" />,
    conversations_new: <MessagesSquareIcon className="size-4" />,
    messages_incoming: <ArrowDownLeftIcon className="size-4" />,
    messages_outgoing: <ArrowUpRightIcon className="size-4" />,
    inboxes_total: <InboxIcon className="size-4" />,
};

const trendOf = (change: number) => (change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

export function Kpis({ data }: { data: KpisData }) {
    return (
        <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4 @3xl:gap-6">
            {data.metrics.map(metric => (
                <StatisticsCard
                    key={metric.key}
                    icon={KPI_ICON[metric.key] ?? <SigmaIcon className="size-4" />}
                    value={formatNumber(metric.value)}
                    title={t(`ADMIN_DASHBOARD.METRICS.${metric.key.toUpperCase()}`)}
                    changePercentage={
                        metric.changePercent === null
                            ? null
                            : `${metric.changePercent > 0 ? '+' : ''}${formatPercent(metric.changePercent)}%`
                    }
                    trend={metric.changePercent === null ? 'flat' : trendOf(metric.changePercent)}
                    comparisonText={t('ADMIN_DASHBOARD.RANGE.COMPARED')}
                    note={
                        metric.previous === null
                            ? t('ADMIN_DASHBOARD.RANGE.SNAPSHOT')
                            : t('ADMIN_DASHBOARD.RANGE.PREVIOUS', { value: formatNumber(metric.previous) })
                    }
                />
            ))}
        </div>
    );
}

export function seriesSummary(series: ChartSeries, dates: string[]): string {
    const total = series.values.reduce((sum, value) => sum + value, 0);
    const max = Math.max(0, ...series.values);
    const peakIndex = series.values.indexOf(max);

    return t('ADMIN_DASHBOARD.CHART.SUMMARY', {
        label: series.label,
        total: formatNumber(total),
        max: formatNumber(max),
        date: peakIndex >= 0 && dates[peakIndex] ? formatDay(dates[peakIndex]) : '-',
    });
}

function DailyChart({ title, dates, series, variant }: { title: string; dates: string[]; series: ChartSeries[]; variant: 'line' | 'bar' }) {
    return (
        <TimeSeriesChart
            title={title}
            dates={dates}
            series={series}
            variant={variant}
            summary={series.map(item => seriesSummary(item, dates)).join(' ')}
            dateLabel={t('ADMIN_DASHBOARD.CHART.DATE')}
            formatDate={formatDay}
            formatValue={formatNumber}
        />
    );
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function peakDay(dates: string[], values: number[]): string {
    const max = Math.max(0, ...values);
    const index = values.indexOf(max);

    return index >= 0 && dates[index] ? `${formatNumber(max)} · ${formatDay(dates[index])}` : '-';
}

// Hai ô tỉ lệ và ngày cao điểm ở trên (tổng tin vào/ra đã có ở hàng chỉ số), biểu đồ đường dưới.
export function MessagesTrend({ data, title }: { data: MessagesTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const incoming = data.days.map(day => day.incoming);
    const outgoing = data.days.map(day => day.outgoing);
    const totalIn = sum(incoming);
    const totalOut = sum(outgoing);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <MetricBoxes
                className="grid gap-4 @md:grid-cols-2"
                metrics={[
                    {
                        key: 'ratio',
                        icon: <RepeatIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.TREND.REPLY_RATIO'),
                        value: totalIn === 0 ? '-' : `${formatPercent((totalOut / totalIn) * 100)}%`,
                    },
                    {
                        key: 'peak',
                        icon: <CalendarArrowUpIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.TREND.PEAK'),
                        value: peakDay(dates, incoming),
                    },
                ]}
            />
            <InsetCard className="ring-foreground/10 flex-1 shadow-none ring-1">
                <CardContent>
                    <DailyChart
                        title={title}
                        dates={dates}
                        variant="line"
                        series={[
                            { key: 'incoming', label: t('ADMIN_DASHBOARD.SERIES.INCOMING'), values: incoming },
                            { key: 'outgoing', label: t('ADMIN_DASHBOARD.SERIES.OUTGOING'), values: outgoing },
                        ]}
                    />
                </CardContent>
            </InsetCard>
        </div>
    );
}

// Kiểu thẻ "insight": số nổi bật trên, đường kẻ, biểu đồ cột dưới.
export function SignupsTrend({ data, title }: { data: SignupsTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const counts = data.days.map(day => day.count);
    const total = sum(counts);

    return (
        <div className="flex flex-col gap-5">
            <ProductInsightsStats
                columns
                stats={[
                    { key: 'total', label: t('ADMIN_DASHBOARD.TREND.TOTAL'), value: formatNumber(total) },
                    {
                        key: 'average',
                        label: t('ADMIN_DASHBOARD.TREND.AVERAGE'),
                        value: formatNumber(counts.length ? Math.round((total / counts.length) * 10) / 10 : 0),
                    },
                    { key: 'peak', label: t('ADMIN_DASHBOARD.TREND.PEAK'), value: peakDay(dates, counts) },
                ]}
            />
            <Separator />
            <DailyChart
                title={title}
                dates={dates}
                variant="bar"
                series={[{ key: 'signups', label: t('ADMIN_DASHBOARD.SERIES.SIGNUPS'), values: counts }]}
            />
        </div>
    );
}

const CHANNEL_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Vành khuyên chia theo kênh, tổng ở giữa; chú giải là danh sách kênh với số và tỉ lệ.
export function ConversationsByChannel({ data }: { data: ConversationsByChannelData }) {
    const slices = data.items.map((item, index) => ({
        key: `channel${index}`,
        label: item.platform.name,
        value: item.count,
        color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
    }));

    // Ô thường cao theo ô biểu đồ bên cạnh: căn giữa dọc để khoảng trống chia đều trên dưới.
    return (
        <div className="flex flex-1 flex-col justify-center">
            <GoalDonut
                title={t('ADMIN_DASHBOARD.WIDGETS.CONVERSATIONS_BY_CHANNEL.TITLE')}
                slices={slices}
                centerValue={formatNumber(data.total)}
                centerLabel={t('ADMIN_DASHBOARD.CHANNELS.CENTER')}
                legend={
                    <ul className="flex flex-col gap-2">
                        {slices.map(slice => (
                            <li key={slice.key} className="flex items-center gap-2 text-sm">
                                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                                <span className="text-muted-foreground shrink-0 tabular-nums">
                                    {data.total > 0 ? `${formatPercent((slice.value / data.total) * 100)}%` : '-'}
                                </span>
                            </li>
                        ))}
                    </ul>
                }
            />
        </div>
    );
}

// Mọi bước có một dòng chú thích để nhịp đều; bước trước bằng 0 thì nói rõ, không in "-%".
function funnelCaption(step: FunnelStep, index: number): string {
    if (index === 0) return t('ADMIN_DASHBOARD.FUNNEL.BASELINE');

    const previous =
        step.rateFromPrevious === null
            ? t('ADMIN_DASHBOARD.FUNNEL.PREVIOUS_EMPTY')
            : t('ADMIN_DASHBOARD.FUNNEL.FROM_PREVIOUS', { rate: formatPercent(step.rateFromPrevious) });

    return step.rateFromStart === null
        ? previous
        : `${previous} · ${t('ADMIN_DASHBOARD.FUNNEL.FROM_START', { rate: formatPercent(step.rateFromStart) })}`;
}

// Phễu: mỗi bước một thanh tiến độ, độ dài theo tỉ lệ so với bước đăng ký.
export function ActivationFunnel({ data, title }: { data: ActivationFunnelData; title: string }) {
    const start = Math.max(1, data.steps[0]?.count ?? 0);

    return (
        <FunnelProgress
            title={title}
            steps={data.steps.map((step, index) => ({
                key: step.key,
                label: t(`ADMIN_DASHBOARD.FUNNEL_STEPS.${step.key.toUpperCase()}`),
                count: formatNumber(step.count),
                percentage: (step.count / start) * 100,
                caption: funnelCaption(step, index),
            }))}
        />
    );
}
