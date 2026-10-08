import Loader from 'shared/components/loader/Loader';
import { t } from '../../../../i18n';
import { useReportMetrics } from '../../composables/useReportMetrics';
import { reportsSelectors, STATUS } from '../../store';
import type { ReportMetric } from '../../types.metrics';

// Port từ reports/components/ChartElements/ChartStats.vue
interface ChartStatsProps {
    metric: ReportMetric;
    accountSummarySelector?: typeof reportsSelectors.accountSummary;
    summaryFetchingSelector?: typeof reportsSelectors.accountSummaryFetchingStatus;
    className?: string;
}

export default function ChartStats({
    metric,
    accountSummarySelector = reportsSelectors.accountSummary,
    summaryFetchingSelector = reportsSelectors.accountSummaryFetchingStatus,
    className = '',
}: ChartStatsProps) {
    const { calculateTrend, displayMetric, isAverageMetricType, fetchingStatus } = useReportMetrics(
        accountSummarySelector,
        summaryFetchingSelector,
    );

    const trendColor = (value: number, key: string) => {
        if (isAverageMetricType(key)) {
            return value > 0 ? 'border-n-ruby-9 text-n-ruby-9' : 'border-n-teal-10 text-n-teal-10';
        }
        return value < 0 ? 'border-n-ruby-9 text-n-ruby-9' : 'border-n-teal-10 text-n-teal-10';
    };

    return (
        <div className={`text-n-slate-11 ${className}`.trim()}>
            <span className="text-sm">{metric.NAME}</span>
            <div className="flex items-end text-n-slate-12">
                {fetchingStatus === STATUS.FETCHING && (
                    <div>
                        <Loader />
                    </div>
                )}
                {fetchingStatus === STATUS.FAILED && (
                    <div className="text-n-ruby-10 text-sm">{t('REPORT.SUMMARY_FETCHING_FAILED')}</div>
                )}
                {fetchingStatus === STATUS.FINISHED && (
                    <div className="text-xl font-medium">{displayMetric(metric.KEY)}</div>
                )}
                {Boolean(metric.trend) && fetchingStatus === STATUS.FINISHED && (
                    <div className="text-xs ml-4 flex items-center mb-0.5">
                        {metric.trend < 0 ? (
                            <div
                                className={`h-0 w-0 border-x-4 medium border-x-transparent border-t-[8px] mr-1 ${trendColor(metric.trend, metric.KEY)}`}
                            />
                        ) : (
                            <div
                                className={`h-0 w-0 border-x-4 medium border-x-transparent border-b-[8px] mr-1 ${trendColor(metric.trend, metric.KEY)}`}
                            />
                        )}
                        <span className={`font-medium ${trendColor(metric.trend, metric.KEY)}`}>
                            {calculateTrend(metric.KEY)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
