import { DesignTimeSeries as TimeSeriesChart, DesignDonut as GoalDonut, chartSeriesColor } from '../../design-preview/chart-components';
import { ChartInsights } from '../../design-preview/chart-insights';
import { MetricCard } from '../../design-preview/components';
import {
    ActivityIcon,
    ArrowDownLeftIcon,
    ArrowUpRightIcon,
    Building2Icon,
    CalendarDays,
    InboxIcon,
    MessagesSquareIcon,
    Repeat,
    SigmaIcon,
    UserPlusIcon,
    UsersIcon,
} from '@admin/components/icons';
import type { ReactNode } from 'react';

import { Separator } from '@admin/components/ui/separator';
import type { ChartSeries } from '@admin/views/dashboards/charts/chart-sales-metrics';
import FunnelProgress from '@admin/views/dashboards/widgets/widget-funnel';
import ProductInsightsStats from '@admin/views/dashboards/widgets/widget-product-insights';
import { CATEGORY_SERIES, MEANING_TONE, TONE_FILL, type Tone } from '@admin/views/dashboards/tones';

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

const trendOf = (change: number) => (change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

export function Kpis({ data }: { data: KpisData }) {
    return (
        <div className="metrics-grid">
            {data.metrics.map(metric => (
                <MetricCard
                    key={metric.key}
                    label={t(`ADMIN_DASHBOARD.METRICS.${metric.key.toUpperCase()}`)}
                    value={formatNumber(metric.value)}
                    purpose={metric.key === 'inboxes_total' ? 'connections' : metric.key.startsWith('messages_') || metric.key === 'conversations_new' ? 'messages' : 'users'}
                    tone="brand"
                    trend={metric.changePercent === null ? 'flat' : trendOf(metric.changePercent)}
                    change={metric.changePercent === null ? '' : `${metric.changePercent > 0 ? '+' : ''}${formatPercent(metric.changePercent)}%`}
                    comparison={metric.previous === null ? t('ADMIN_DASHBOARD.RANGE.SNAPSHOT') : t('ADMIN_DASHBOARD.RANGE.PREVIOUS', { value: formatNumber(metric.previous) })}
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

// Ngày cao nhất: "10 tin, ngày 30/09" (số kèm đơn vị, không ghép trần "10 · 30/09").
function peak(dates: string[], values: number[]): { count: string; date: string } | null {
    const max = Math.max(0, ...values);
    const index = values.indexOf(max);

    return max > 0 && dates[index] ? { count: formatNumber(max), date: formatDay(dates[index]) } : null;
}

export function MessagesTrend({ data, title }: { data: MessagesTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const incoming = data.days.map(day => day.incoming);
    const outgoing = data.days.map(day => day.outgoing);
    const totalIn = sum(incoming);
    const totalOut = sum(outgoing);
    const peakIncoming = peak(dates, incoming);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <ChartInsights items={[
                {
                    id: 'ratio',
                    icon: <Repeat />,
                    label: t('ADMIN_DASHBOARD.TREND.REPLY_RATIO'),
                    value: totalIn === 0 ? '-' : `${formatPercent((totalOut / totalIn) * 100)}%`,
                    detail: t('ADMIN_DASHBOARD.TREND.SELECTED_RANGE'),
                },
                {
                    id: 'peak',
                    icon: <CalendarDays />,
                    label: t('ADMIN_DASHBOARD.TREND.PEAK_INCOMING'),
                    value: peakIncoming ? t('ADMIN_DASHBOARD.TREND.MESSAGE_COUNT', { count: peakIncoming.count }) : '-',
                    detail: peakIncoming ? t('ADMIN_DASHBOARD.TREND.ON_DATE', { date: peakIncoming.date }) : '',
                },
            ]} />
            <DailyChart
                title={title}
                dates={dates}
                variant="line"
                series={[
                    { key: 'incoming', label: t('ADMIN_DASHBOARD.SERIES.INCOMING'), values: incoming, color: chartSeriesColor(0) },
                    {
                        key: 'outgoing',
                        label: t('ADMIN_DASHBOARD.SERIES.OUTGOING'),
                        values: outgoing,
                        color: chartSeriesColor(1),
                    },
                ]}
            />
        </div>
    );
}

// Kiểu thẻ "insight": số nổi bật trên, đường kẻ, biểu đồ cột dưới.
export function SignupsTrend({ data, title }: { data: SignupsTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const counts = data.days.map(day => day.count);
    const total = sum(counts);
    const peakSignups = peak(dates, counts);
    const tone = MEANING_TONE.accounts;

    return (
        <div className="flex flex-col gap-5">
            <ProductInsightsStats
                columns
                stats={[
                    { key: 'total', label: t('ADMIN_DASHBOARD.TREND.TOTAL'), value: formatNumber(total), tone },
                    {
                        key: 'average',
                        tone,
                        label: t('ADMIN_DASHBOARD.TREND.AVERAGE'),
                        value: formatNumber(counts.length ? Math.round((total / counts.length) * 10) / 10 : 0),
                    },
                    {
                        key: 'peak',
                        tone,
                        label: t('ADMIN_DASHBOARD.TREND.PEAK'),
                        value: peakSignups ? peakSignups.count : '-',
                        hint: peakSignups ? t('ADMIN_DASHBOARD.TREND.ON_DATE', { date: peakSignups.date }) : undefined,
                    },
                ]}
            />
            <Separator />
            <DailyChart
                title={title}
                dates={dates}
                variant="bar"
                series={[{ key: 'signups', label: t('ADMIN_DASHBOARD.SERIES.SIGNUPS'), values: counts, color: chartSeriesColor(1) }]}
            />
        </div>
    );
}

// Vành khuyên chia theo kênh, tổng ở giữa; chú giải là danh sách kênh với số và tỉ lệ (nhãn chữ trực tiếp,
// không chỉ dựa vào màu). Kênh là chuỗi phân loại nên dùng CATEGORY_SERIES (không lấy màu trạng thái).
export function ConversationsByChannel({ data }: { data: ConversationsByChannelData }) {
    const slices = data.items.map((item, index) => ({
        key: `channel${index}`,
        label: item.platform.name,
        value: item.count,
        color: chartSeriesColor(index),
    }));

    return (
        <GoalDonut
            title={t('ADMIN_DASHBOARD.WIDGETS.CONVERSATIONS_BY_CHANNEL.TITLE')}
            slices={slices}
            centerValue={formatNumber(data.total)}
            centerLabel={t('ADMIN_DASHBOARD.CHANNELS.CENTER')}
            formatValue={formatNumber}
        />
    );
}

// Một dòng chú thích ngắn: tỉ lệ so với bước trước. Bước đầu và bước sau một bước 0 không có chú thích
// (không lặp "bước trước chưa có tài khoản" ở mọi dòng); tỉ lệ so với đăng ký nằm cạnh số đếm.
function funnelCaption(step: FunnelStep, index: number): string | undefined {
    if (index === 0 || step.rateFromPrevious === null) return undefined;

    return t('ADMIN_DASHBOARD.FUNNEL.FROM_PREVIOUS', { rate: formatPercent(step.rateFromPrevious) });
}

// Màu bước theo nghĩa của mốc: hồ sơ (đăng ký, xác nhận email) navy, kênh (hộp thư, kết nối) cyan,
// hội thoại (nhận tin, trả lời) primary. Không tô cầu vồng theo thứ tự.
const FUNNEL_STEP_MEANING: Record<string, keyof typeof MEANING_TONE> = {
    signed_up: 'accounts',
    confirmed_email: 'accounts',
    created_inbox: 'inboxes',
    connected_channel: 'inboxes',
    received_message: 'conversations',
    replied: 'conversations',
};

// Phễu: mỗi bước một thanh tiến độ, độ dài theo tỉ lệ so với bước đăng ký.
export function ActivationFunnel({ data, title }: { data: ActivationFunnelData; title: string }) {
    const start = Math.max(1, data.steps[0]?.count ?? 0);

    return (
        <FunnelProgress
            title={title}
            steps={data.steps.map((step, index) => ({
                key: step.key,
                index: index + 1,
                tone: MEANING_TONE[FUNNEL_STEP_MEANING[step.key] ?? 'system'],
                label: t(`ADMIN_DASHBOARD.FUNNEL_STEPS.${step.key.toUpperCase()}`),
                count: formatNumber(step.count),
                share: index === 0 || step.rateFromStart === null ? undefined : `${formatPercent(step.rateFromStart)}%`,
                percentage: (step.count / start) * 100,
                caption: funnelCaption(step, index),
            }))}
        />
    );
}
