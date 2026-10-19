import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { formatTime } from '@ext/utils';
import { fromUnixTime } from 'date-fns';

import BarChart from 'shared/components/charts/BarChart';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import { formatInLocale } from 'shared/helpers/timeHelper';
import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import ChartStats from './components/ChartElements/ChartStats';
import ReportDrilldownDrawer, { type DrilldownRequest } from './components/ReportDrilldownDrawer';
import { GROUP_BY_FILTER, type GroupByFilter } from './constants';
import { isAverageMetricType, useReportMetrics } from './composables/useReportMetrics';
import { reportsSelectors, useReportsState } from './store';
import type { ReportDataPoint } from './types';
import type { ReportMetric } from './types.metrics';

// Port từ reports/ReportContainer.vue

const DURATION_UNITS_IN_SECONDS = [1, 60, 60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60, 30 * 24 * 60 * 60, 365 * 24 * 60 * 60];
const DURATION_STEP_MULTIPLIERS = [1, 2, 3, 5, 6, 10, 12, 15, 30];
const DURATION_STEP_SIZES = [
    ...new Set(DURATION_UNITS_IN_SECONDS.flatMap(unit => DURATION_STEP_MULTIPLIERS.map(multiplier => unit * multiplier))),
].sort((first, second) => first - second);

export const DEFAULT_REPORT_KEYS: Record<string, string> = {
    CONVERSATIONS: 'conversations_count',
    INCOMING_MESSAGES: 'incoming_messages_count',
    OUTGOING_MESSAGES: 'outgoing_messages_count',
    FIRST_RESPONSE_TIME: 'avg_first_response_time',
    RESOLUTION_TIME: 'avg_resolution_time',
    RESOLUTION_COUNT: 'resolutions_count',
    REPLY_TIME: 'reply_time',
};

interface ReportContainerProps {
    groupBy?: GroupByFilter;
    from?: number;
    to?: number;
    reportType?: string;
    selectedItemId?: string | number | null;
    businessHours?: boolean;
    reportKeys?: Record<string, string>;
    accountSummarySelector?: typeof reportsSelectors.accountSummary;
    summaryFetchingSelector?: typeof reportsSelectors.accountSummaryFetchingStatus;
}

export default function ReportContainer({
    groupBy = GROUP_BY_FILTER[1],
    from = 0,
    to = 0,
    reportType = 'account',
    selectedItemId = null,
    businessHours = false,
    reportKeys = DEFAULT_REPORT_KEYS,
    accountSummarySelector = reportsSelectors.accountSummary,
    summaryFetchingSelector = reportsSelectors.accountSummaryFetchingStatus,
}: ReportContainerProps) {
    const { currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountReport = useReportsState(reportsSelectors.accountReport);
    const { calculateTrend } = useReportMetrics(accountSummarySelector, summaryFetchingSelector);

    const [drilldownRequest, setDrilldownRequest] = useState<DrilldownRequest | null>(null);
    const [drilldownMetric, setDrilldownMetric] = useState<ReportMetric | null>(null);
    const [drilldownIndex, setDrilldownIndex] = useState<number | null>(null);

    const isAdmin = currentAccountUser?.role === 'administrator';

    const infoText: Record<string, string> = {
        FIRST_RESPONSE_TIME: t('REPORT.METRICS.FIRST_RESPONSE_TIME.INFO_TEXT'),
        RESOLUTION_TIME: t('REPORT.METRICS.RESOLUTION_TIME.INFO_TEXT'),
    };

    const metrics: ReportMetric[] = Object.keys(reportKeys).map(key => ({
        NAME: t(`REPORT.METRICS.${key}.NAME`),
        KEY: reportKeys[key],
        DESC: t(`REPORT.METRICS.${key}.DESC`),
        INFO_TEXT: infoText[key],
        trend: calculateTrend(reportKeys[key]),
    }));

    const getChartData = (metric: ReportMetric) => {
        const data = accountReport.data[metric.KEY];
        if (!data) return { categories: [] as string[], series: [] as unknown[] };

        const categories = data.map(element => {
            if (groupBy?.period === GROUP_BY_FILTER[2].period) {
                const weekDate = new Date(fromUnixTime(element.timestamp));
                const firstDay = weekDate.getDate() - weekDate.getDay();
                const lastDay = firstDay + 6;
                const weekFirstDate = new Date(weekDate.setDate(firstDay));
                const weekLastDate = new Date(weekDate.setDate(lastDay));
                return `${formatInLocale(weekFirstDate, 'dd-MMM')} - ${formatInLocale(weekLastDate, 'dd-MMM')}`;
            }
            if (groupBy?.period === GROUP_BY_FILTER[3].period) return formatInLocale(fromUnixTime(element.timestamp), 'MMM-yyyy');
            if (groupBy?.period === GROUP_BY_FILTER[4].period) return formatInLocale(fromUnixTime(element.timestamp), 'yyyy');
            return formatInLocale(fromUnixTime(element.timestamp), 'dd-MMM');
        });

        return {
            categories,
            series: [
                {
                    id: metric.KEY,
                    label: metric.KEY === 'reply_time' ? t('REPORT.METRICS.REPLY_TIME.TOOLTIP_LABEL') : metric.NAME,
                    color: 'rgb(var(--blue-9))',
                    data,
                },
            ],
        };
    };

    const getChartAriaLabel = (metric: ReportMetric) => {
        const groupingLabels: Record<string, string> = {
            day: t('REPORT.GROUPING_OPTIONS.DAY'),
            week: t('REPORT.GROUPING_OPTIONS.WEEK'),
            month: t('REPORT.GROUPING_OPTIONS.MONTH'),
            year: t('REPORT.GROUPING_OPTIONS.YEAR'),
        };
        return `${metric.NAME}, ${groupingLabels[groupBy.period]}`;
    };

    const getValueFormatter = (metric: ReportMetric) => {
        if (!isAverageMetricType(metric.KEY)) return (value: number) => Number(value).toLocaleString();

        return (value: number, dataPoint?: unknown) => {
            if (!dataPoint && value === 0) return '0';
            return formatTime(value || 0);
        };
    };

    const getPointDescription = (metric: ReportMetric) => {
        const descriptionKey =
            metric.KEY === 'avg_first_response_time'
                ? 'REPORT.METRICS.FIRST_RESPONSE_TIME.TOOLTIP_DESCRIPTION'
                : metric.KEY === 'avg_resolution_time'
                  ? 'REPORT.METRICS.RESOLUTION_TIME.TOOLTIP_DESCRIPTION'
                  : metric.KEY === 'reply_time'
                    ? 'REPORT.METRICS.REPLY_TIME.TOOLTIP_DESCRIPTION'
                    : '';
        if (!descriptionKey) return undefined;

        return (dataPoint: unknown) => {
            const count = (dataPoint as ReportDataPoint)?.count || 0;
            return t(descriptionKey, { count, n: count });
        };
    };

    const getDurationStepSize = ({ min, max, tickCount }: { min: number; max: number; tickCount: number }) => {
        const targetStep = (max - min) / Math.max(tickCount - 1, 1);
        return DURATION_STEP_SIZES.reduce((closestStep, step) =>
            Math.abs(step - targetStep) < Math.abs(closestStep - targetStep) ? step : closestStep,
        );
    };

    const isDrilldownEnabled = () => Boolean(from && to);

    const canOpenDrilldown = (metric: ReportMetric, dataPoint?: ReportDataPoint) => {
        if (!dataPoint) return false;
        if (isAverageMetricType(metric.KEY)) return (dataPoint.count ?? 0) > 0;
        return dataPoint.value > 0;
    };

    const findDrillableIndex = (startIndex: number, step: number) => {
        if (!drilldownMetric) return null;

        const data = accountReport.data[drilldownMetric.KEY] || [];
        for (let index = startIndex; index >= 0 && index < data.length; index += step) {
            if (canOpenDrilldown(drilldownMetric, data[index])) return index;
        }
        return null;
    };

    const openDrilldownAt = (metric: ReportMetric, dataIndex: number) => {
        const dataPoint = accountReport.data[metric.KEY]?.[dataIndex];
        if (!canOpenDrilldown(metric, dataPoint)) return;

        setDrilldownMetric(metric);
        setDrilldownIndex(dataIndex);
        setDrilldownRequest({
            metric: metric.KEY,
            metricName: metric.NAME,
            bucketLabel: getChartData(metric).categories[dataIndex],
            bucketTimestamp: dataPoint.timestamp,
            bucketValue: dataPoint.value,
            isAverageMetric: isAverageMetricType(metric.KEY),
            from,
            to,
            type: reportType,
            id: selectedItemId,
            groupBy: groupBy?.period,
            businessHours,
        });
    };

    const onChartElementClick = (metric: ReportMetric, event: { item?: unknown; pointIndex: number }) => {
        if (!isDrilldownEnabled()) return;

        if (!canOpenDrilldown(metric, event.item as ReportDataPoint)) return;
        if (!isAdmin) {
            useAlert(t('REPORT.DRILLDOWN.ADMIN_ONLY'));
            return;
        }

        openDrilldownAt(metric, event.pointIndex);
    };

    const closeDrilldown = () => {
        setDrilldownRequest(null);
        setDrilldownMetric(null);
        setDrilldownIndex(null);
    };

    const canDrilldownPrev = findDrillableIndex((drilldownIndex ?? 0) - 1, -1) !== null;
    const canDrilldownNext = findDrillableIndex((drilldownIndex ?? 0) + 1, 1) !== null;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 px-6 py-5 panel-surface rounded-xl mt-4">
                {metrics.map(metric => (
                    <div key={metric.KEY} className="py-4 mb-3 rounded-md">
                        <ChartStats
                            metric={metric}
                            accountSummarySelector={accountSummarySelector}
                            summaryFetchingSelector={summaryFetchingSelector}
                            className="px-4"
                        />
                        <div className="mt-4 h-72">
                            {accountReport.isFetching[metric.KEY] ? (
                                <LoadingState className="text-xs" message={t('REPORT.LOADING_CHART')} />
                            ) : (
                                <div className="flex items-center justify-center min-w-0 h-72">
                                    {accountReport.data[metric.KEY]?.length ? (
                                        <BarChart
                                            data={getChartData(metric)}
                                            ariaLabel={getChartAriaLabel(metric)}
                                            formatValue={getValueFormatter(metric)}
                                            pointDescription={getPointDescription(metric)}
                                            yStepSize={isAverageMetricType(metric.KEY) ? getDurationStepSize : undefined}
                                            height={288}
                                            timeseries
                                            clickable={isDrilldownEnabled()}
                                            onItemClick={payload => onChartElementClick(metric, payload)}
                                        />
                                    ) : (
                                        <span className="text-sm text-n-slate-10">{t('REPORT.NO_ENOUGH_DATA')}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <ReportDrilldownDrawer
                open={Boolean(drilldownRequest)}
                request={drilldownRequest}
                canPrev={canDrilldownPrev}
                canNext={canDrilldownNext}
                onNavigate={direction => {
                    const nextIndex = findDrillableIndex((drilldownIndex ?? 0) + direction, direction);
                    if (nextIndex === null || !drilldownMetric) return;
                    openDrilldownAt(drilldownMetric, nextIndex);
                }}
                onClose={closeDrilldown}
            />
        </>
    );
}
