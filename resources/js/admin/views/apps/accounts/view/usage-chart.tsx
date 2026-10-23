import { DesignTimeSeries, chartSeriesColor } from '../../../../../superadmin/design-preview/chart-components';
import { t } from '../../../../../i18n';
export type UsageDay = { date: string; label: string; count: number };
export interface UsageChartProps {
    data: UsageDay[];
    seriesLabel: string;
    summary: string;
    dayLabel: (day: UsageDay) => string;
    startLabel: string;
    endLabel: string;
    formatValue?: (value: number) => string;
    className?: string;
}
export function UsageChart({ data, seriesLabel, summary, startLabel, endLabel, formatValue = String, className }: UsageChartProps) {
    return <figure className={className}>
        <DesignTimeSeries title={seriesLabel} dates={data.map(day => day.date)} series={[{ key: 'messages', label: seriesLabel, values: data.map(day => day.count), color: chartSeriesColor(0) }]} variant="bar" summary={summary} dateLabel={t('ADMIN_DASHBOARD.CHART.DATE')} formatDate={date => data.find(day => day.date === date)?.label ?? date} formatValue={formatValue} />
        <figcaption className="sr-only">{startLabel}–{endLabel}</figcaption>
    </figure>;
}
