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
import TimeSeriesChart, { InsetCard, MetricBoxes } from '@admin/views/dashboards/charts/chart-sales-metrics';
import type { ChartSeries } from '@admin/views/dashboards/charts/chart-sales-metrics';
import StatisticsCard from '@admin/views/dashboards/statistics/statistics-card-01';
import FunnelProgress from '@admin/views/dashboards/widgets/widget-funnel';
import ProductInsightsStats from '@admin/views/dashboards/widgets/widget-product-insights';
import TotalEarningList from '@admin/views/dashboards/widgets/widget-total-earning';

import { t } from '../../../i18n';
import { formatDay, formatNumber, formatPercent } from '../format';
import type {
    ActivationFunnelData,
    ConversationsByChannelData,
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
        <div className="grid grid-cols-2 gap-4 @lg:gap-6 @3xl:grid-cols-4">
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

// Ô số nhỏ viền mảnh ở trên, biểu đồ đường trong thẻ lồng ở dưới.
export function MessagesTrend({ data, title }: { data: MessagesTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const incoming = data.days.map(day => day.incoming);
    const outgoing = data.days.map(day => day.outgoing);
    const totalIn = sum(incoming);
    const totalOut = sum(outgoing);

    return (
        <div className="flex flex-col gap-6">
            <MetricBoxes
                className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4"
                metrics={[
                    {
                        key: 'incoming',
                        icon: <ArrowDownLeftIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.SERIES.INCOMING'),
                        value: formatNumber(totalIn),
                    },
                    {
                        key: 'outgoing',
                        icon: <ArrowUpRightIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.SERIES.OUTGOING'),
                        value: formatNumber(totalOut),
                    },
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
            <InsetCard>
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

export function ConversationsByChannel({ data }: { data: ConversationsByChannelData }) {
    const max = Math.max(1, ...data.items.map(item => item.count));

    return (
        <TotalEarningList
            total={{ value: formatNumber(data.total) }}
            items={data.items.map(item => ({
                key: item.channelType ?? item.platform.key,
                label: item.platform.name,
                title: item.platform.name,
                icon: <MessagesSquareIcon className="size-5" />,
                value: formatNumber(item.count),
                progressPercentage: (item.count / max) * 100,
            }))}
        />
    );
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
                caption:
                    index > 0
                        ? `${t('ADMIN_DASHBOARD.FUNNEL.FROM_PREVIOUS', { rate: formatPercent(step.rateFromPrevious) })} · ${t(
                              'ADMIN_DASHBOARD.FUNNEL.FROM_START',
                              { rate: formatPercent(step.rateFromStart) },
                          )}`
                        : undefined,
            }))}
        />
    );
}
