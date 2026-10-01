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

import { Separator } from '@admin/components/ui/separator';
import TimeSeriesChart, { GoalDonut, MetricBoxes } from '@admin/views/dashboards/charts/chart-sales-metrics';
import type { ChartSeries } from '@admin/views/dashboards/charts/chart-sales-metrics';
import StatisticsCard from '@admin/views/dashboards/statistics/statistics-card-01';
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

// Màu theo nghĩa (MEANING_TONE): cùng chỉ số, cùng màu ở mọi trang.
const KPI_TONE: Record<string, Tone> = {
    accounts_total: MEANING_TONE.accounts,
    accounts_new: MEANING_TONE.accounts,
    accounts_active: MEANING_TONE.accounts,
    users_total: MEANING_TONE.people,
    conversations_new: MEANING_TONE.conversations,
    messages_incoming: MEANING_TONE.messages,
    messages_outgoing: MEANING_TONE.messages,
    inboxes_total: MEANING_TONE.inboxes,
};

const trendOf = (change: number) => (change > 0 ? 'up' : change < 0 ? 'down' : 'flat');

export function Kpis({ data }: { data: KpisData }) {
    return (
        <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4 @3xl:gap-6">
            {data.metrics.map(metric => (
                <StatisticsCard
                    key={metric.key}
                    tone={KPI_TONE[metric.key] ?? 'neutral'}
                    icon={KPI_ICON[metric.key] ?? <SigmaIcon className="size-4" />}
                    value={formatNumber(metric.value)}
                    title={t(`ADMIN_DASHBOARD.METRICS.${metric.key.toUpperCase()}`)}
                    changePercentage={
                        metric.changePercent === null
                            ? null
                            : `${metric.changePercent > 0 ? '+' : ''}${formatPercent(metric.changePercent)}%`
                    }
                    trend={metric.changePercent === null ? 'flat' : trendOf(metric.changePercent)}
                    // Mọi thẻ có kỳ trước cùng một kiểu so sánh: "Kỳ trước: N", thêm chip chênh lệch khi tính được.
                    comparisonText={
                        metric.previous === null ? undefined : t('ADMIN_DASHBOARD.RANGE.PREVIOUS', { value: formatNumber(metric.previous) })
                    }
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

// Ngày cao nhất: "10 tin, ngày 30/09" (số kèm đơn vị, không ghép trần "10 · 30/09").
function peak(dates: string[], values: number[]): { count: string; date: string } | null {
    const max = Math.max(0, ...values);
    const index = values.indexOf(max);

    return max > 0 && dates[index] ? { count: formatNumber(max), date: formatDay(dates[index]) } : null;
}

// Hai ô tỉ lệ và ngày cao điểm ở trên (tổng tin vào/ra đã có ở hàng chỉ số), biểu đồ đường dưới.
export function MessagesTrend({ data, title }: { data: MessagesTrendData; title: string }) {
    const dates = data.days.map(day => day.date);
    const incoming = data.days.map(day => day.incoming);
    const outgoing = data.days.map(day => day.outgoing);
    const totalIn = sum(incoming);
    const totalOut = sum(outgoing);
    const peakIncoming = peak(dates, incoming);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <MetricBoxes
                className="grid gap-4 @md:grid-cols-2"
                metrics={[
                    {
                        key: 'ratio',
                        tone: MEANING_TONE.messages,
                        icon: <RepeatIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.TREND.REPLY_RATIO'),
                        value: totalIn === 0 ? '-' : `${formatPercent((totalOut / totalIn) * 100)}%`,
                    },
                    {
                        key: 'peak',
                        tone: MEANING_TONE.messages,
                        icon: <CalendarArrowUpIcon className="size-5" />,
                        title: t('ADMIN_DASHBOARD.TREND.PEAK_INCOMING'),
                        value: peakIncoming ? t('ADMIN_DASHBOARD.TREND.PEAK_MESSAGES', peakIncoming) : '-',
                    },
                ]}
            />
            {/* Biểu đồ đặt thẳng trong thẻ, không lồng thêm khung viền. Tin ra là chuỗi thứ hai của cùng họ "tin nhắn":
                nét đứt cyan (màu chuỗi thứ hai), đọc được không qua màu. */}
            <DailyChart
                title={title}
                dates={dates}
                variant="line"
                series={[
                    { key: 'incoming', label: t('ADMIN_DASHBOARD.SERIES.INCOMING'), values: incoming, color: TONE_FILL.primary },
                    {
                        key: 'outgoing',
                        label: t('ADMIN_DASHBOARD.SERIES.OUTGOING'),
                        values: outgoing,
                        color: TONE_FILL.cyan,
                        dashed: true,
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
                series={[{ key: 'signups', label: t('ADMIN_DASHBOARD.SERIES.SIGNUPS'), values: counts, color: TONE_FILL[tone] }]}
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
        color: CATEGORY_SERIES[index % CATEGORY_SERIES.length],
    }));

    return (
        <GoalDonut
            title={t('ADMIN_DASHBOARD.WIDGETS.CONVERSATIONS_BY_CHANNEL.TITLE')}
            slices={slices}
            centerValue={formatNumber(data.total)}
            centerLabel={t('ADMIN_DASHBOARD.CHANNELS.CENTER')}
            legend={
                <ul className="flex flex-col gap-2">
                    {slices.map(slice => (
                        <li key={slice.key} className="flex items-center gap-2 text-sm">
                            <span className="size-2.5 shrink-0" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate text-neutral-900">{slice.label}</span>
                            <span className="font-num shrink-0 text-neutral-700">{formatNumber(slice.value)}</span>
                            <span className="font-num w-12 shrink-0 text-right text-neutral-500">
                                {data.total > 0 ? `${formatPercent((slice.value / data.total) * 100)}%` : '-'}
                            </span>
                        </li>
                    ))}
                </ul>
            }
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
