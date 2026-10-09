import { t } from '../../../i18n';
import { csatSelectors, useCsatState } from '../csatStore';
import CsatMetricCard from './CsatMetricCard';
import CsatRatingDistribution from './CsatRatingDistribution';

// Port từ reports/components/CsatMetrics.vue
const formatPercent = (value: string | number) => (value ? `${value}%` : '0%');

export default function CsatMetrics() {
    const metrics = useCsatState(csatSelectors.metrics);
    const ratingCount = useCsatState(csatSelectors.ratingCount);
    const satisfactionScore = useCsatState(csatSelectors.satisfactionScore);
    const responseRate = useCsatState(csatSelectors.responseRate);
    const uiFlags = useCsatState(csatSelectors.uiFlags);

    const isLoading = uiFlags.isFetchingMetrics;
    const responseCount = metrics.totalResponseCount ? metrics.totalResponseCount.toLocaleString() : '0';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex sm:flex-row flex-col w-full gap-4 sm:gap-14 panel-surface rounded-xl px-6 py-5">
                <CsatMetricCard
                    label={t('CSAT_REPORTS.METRIC.TOTAL_RESPONSES.LABEL')}
                    tooltip={t('CSAT_REPORTS.METRIC.TOTAL_RESPONSES.TOOLTIP')}
                    value={responseCount}
                    isLoading={isLoading}
                />

                <div className="w-full sm:w-px bg-n-strong" />

                <CsatMetricCard
                    label={t('CSAT_REPORTS.METRIC.SATISFACTION_SCORE.LABEL')}
                    tooltip={t('CSAT_REPORTS.METRIC.SATISFACTION_SCORE.TOOLTIP')}
                    value={formatPercent(satisfactionScore)}
                    isLoading={isLoading}
                />

                <div className="w-full sm:w-px bg-n-strong" />

                <CsatMetricCard
                    label={t('CSAT_REPORTS.METRIC.RESPONSE_RATE.LABEL')}
                    tooltip={t('CSAT_REPORTS.METRIC.RESPONSE_RATE.TOOLTIP')}
                    value={formatPercent(responseRate)}
                    isLoading={isLoading}
                />
            </div>

            <CsatRatingDistribution
                ratingCount={ratingCount}
                totalResponseCount={metrics.totalResponseCount}
                isLoading={isLoading}
            />
        </div>
    );
}
