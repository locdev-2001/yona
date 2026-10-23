import { DesignTimeSeries, DesignDonut } from './chart-components';
import { dimensionTokens, spacingPixels, toneTokens } from './tokens';
import type { Tone } from './components';
import { Clock3 } from '@admin/components/icons';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Panel, SkeletonBlock } from './components';
import { previewCopy, previewText } from './copy';
import { channels, metricsByPeriod, periodLabels } from './fixtures';
import type { Period } from './fixtures';

const channelSeries = channels.map((channel, index) => ({
    key: ['yona', 'zalo', 'email'][index],
    label: channel.name,
    color: `var(--preview-${['chart-messages', 'chart-connections', 'chart-email'][index]})`,
    share: channel.count / channels.reduce((total, item) => total + item.count, 0),
}));

const plotMargin = { top: spacingPixels('control-gap'), right: 0, bottom: spacingPixels('control-gap'), left: 0 };

const weekLabels = [
    previewCopy.thu_2,
    previewCopy.thu_3,
    previewCopy.thu_4,
    previewCopy.thu_5,
    previewCopy.thu_6,
    previewCopy.thu_7,
    previewCopy.chu_nhat,
];
const periodTicks: Record<Period, string[]> = {
    week: weekLabels,
    month: ['23/09', '28/09', '03/10', '08/10', '13/10', '18/10', '22/10'],
    quarter: ['01/08', '15/08', '01/09', '15/09', '01/10', '15/10', '22/10'],
};

const hourlyTraffic = [
    { hour: '00h', count: 2200 },
    { hour: '03h', count: 800 },
    { hour: '06h', count: 3600 },
    { hour: '09h', count: 24600 },
    { hour: '12h', count: 18400 },
    { hour: '15h', count: 28900 },
    { hour: '18h', count: 41200 },
    { hour: '21h', count: 28692 },
];
const barTones = ['system', 'system', 'activity', 'activity', 'positive', 'positive', 'peak', 'warning'];

export function TrafficChart({ period }: { period: Period }) {
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
    const total = Number(metricsByPeriod[period][1].value.replaceAll('.', ''));
    const traffic: { label: string; [key: string]: string | number }[] = periodTicks[period].map((label, index) => ({
        label,
        ...Object.fromEntries(
            channelSeries.map((series, seriesIndex) => [
                series.key,
                Math.round(
                    (total / 7) *
                        series.share *
                        [0.65, 0.88, 0.78, 1.04, 0.95, 1.25, 1.45][index] *
                        (1 + Math.sin(index + seriesIndex * 2) * 0.08),
                ),
            ]),
        ),
    }));

    return <DesignTimeSeries title={previewCopy.luu_luong_tin_nhan} dates={traffic.map(row=>row.label)} series={channelSeries.map(series=>({key:series.key,label:series.label,color:series.color,values:traffic.map(row=>Number(row[series.key]))}))} summary={previewCopy.du_lieu_minh_hoa_22_10_2026} dateLabel={previewCopy.thu_2} formatDate={label=>label} formatValue={value=>new Intl.NumberFormat('vi-VN').format(value)} />;
}

export function ChannelDistribution() {
    return <DesignDonut title={previewCopy.phan_bo_theo_kenh} slices={channelSeries.map((series,index)=>({key:series.key,label:series.label,color:series.color,value:channels[index].count}))} centerValue="3" centerLabel={previewCopy.kenh_ket_noi} formatValue={value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value)} />;
}

function SystemHealth() {
    const services = [previewCopy.may_chu, previewCopy.hang_doi, previewCopy.ket_noi];
    return (
        <>
            <div className="health-summary">
                <strong>
                    99,8<span>%</span>
                </strong>
                <span>{previewCopy.do_san_sang}</span>
            </div>
            <div className="health-grid">
                {services.map((service, serviceIndex) => (
                    <div key={service} className="health-row">
                        <span>{service}</span>
                        <div className="health-cells">
                            {Array.from({ length: 14 }, (_, day) => {
                                const status =
                                    serviceIndex === 2 && day === 9
                                        ? 'error'
                                        : serviceIndex !== 0 && day === 4
                                          ? 'warning'
                                          : 'positive';
                                const label =
                                    status === 'error'
                                        ? previewCopy.gian_doan
                                        : status === 'warning'
                                          ? previewCopy.cham
                                          : previewCopy.binh_thuong;
                                return (
                                    <span
                                        key={day}
                                        className={`health-cell health-cell--${status}`}
                                        title={previewText('suc_khoe_o', service, day + 9, label)}
                                        aria-label={previewText('suc_khoe_o', service, day + 9, label)}
                                        role="img"
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="health-legend">
                <span>
                    <i />
                    {previewCopy.binh_thuong}
                </span>
                <span>
                    <i />
                    {previewCopy.cham}
                </span>
                <span>
                    <i />
                    {previewCopy.gian_doan}
                </span>
            </div>
        </>
    );
}

export function ActivityCharts({ skeleton }: { skeleton: boolean }) {
    return (
        <div className="chart-secondary-grid">
            <Panel
                title={previewCopy.nhip_hoat_dong}
                description={previewCopy.khung_gio_minh_hoa}
                action={<Clock3 className="muted" />}
            >
                {skeleton ? (
                    <SkeletonBlock className="skeleton-chart" />
                ) : (
                    <>
                        <div className="hourly-chart">
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                                minWidth={0}
                                initialDimension={{ width: 320, height: 220 }}
                            >
                                <BarChart data={hourlyTraffic} margin={plotMargin} accessibilityLayer>
                                    <CartesianGrid
                                        vertical={false}
                                        stroke="var(--preview-border-divider)"
                                        strokeDasharray="2 5"
                                    />
                                    <XAxis
                                        dataKey="hour"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: 'var(--preview-text-secondary)',
                                            fontSize: 'var(--preview-text-chart-axis)',
                                        }}
                                        tickMargin={spacingPixels('control-padding')}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={Number.parseInt(dimensionTokens['chart-axis-width'])}
                                        tick={{
                                            fill: 'var(--preview-text-secondary)',
                                            fontSize: 'var(--preview-text-chart-axis)',
                                        }}
                                        tickFormatter={(value) => `${Number(value) / 1000}k`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'var(--preview-surface-control)' }}
                                        content={({ active, payload, label }) =>
                                            active && payload?.length ? (
                                                <div className="chart-tooltip">
                                                    <strong>{label}</strong>
                                                    <span>
                                                        {new Intl.NumberFormat('vi-VN').format(
                                                            Number(payload[0].value),
                                                        )}{' '}
                                                        {previewCopy.tin_nhan}
                                                    </span>
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <Bar
                                        dataKey="count"
                                        radius={[
                                            Number.parseInt(dimensionTokens['chart-bar-radius']),
                                            Number.parseInt(dimensionTokens['chart-bar-radius']),
                                            0,
                                            0,
                                        ]}
                                        maxBarSize={34}
                                        isAnimationActive={false}
                                    >
                                        {hourlyTraffic.map((entry, index) => (
                                            <Cell
                                                key={entry.hour}
                                                fill={`var(--preview-${toneTokens[barTones[index] as Tone]})`}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="chart-caption">
                            <Clock3 />
                            {previewCopy.gio_cao_diem}
                            <strong>18:00 – 21:00</strong>
                            <span>· 28%</span>
                        </p>
                    </>
                )}
            </Panel>
            <Panel title={previewCopy.suc_khoe_he_thong} description={previewCopy.trong_14_ngay}>
                {skeleton ? <SkeletonBlock className="skeleton-chart" /> : <SystemHealth />}
            </Panel>
        </div>
    );
}
