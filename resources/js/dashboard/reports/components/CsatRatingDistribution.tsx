import { VizPercentageChart } from 'shared/components/charts';
import { CSAT_RATINGS } from 'shared/constants/messages';
import { t } from '../../../i18n';

// Port từ reports/components/CsatRatingDistribution.vue
interface CsatRatingDistributionProps {
    ratingCount?: Record<number, number>;
    totalResponseCount?: number;
    isLoading?: boolean;
}

export default function CsatRatingDistribution({
    ratingCount = {},
    totalResponseCount = 0,
    isLoading = false,
}: CsatRatingDistributionProps) {
    const sortedRatings = [...CSAT_RATINGS].sort((first, second) => second.value - first.value);

    const chartData = {
        total: totalResponseCount,
        segments: sortedRatings.map(rating => ({
            id: rating.key,
            label: t(rating.translationKey),
            value: ratingCount[rating.value] || 0,
            color: rating.color,
        })),
    };

    return (
        <div className="shadow outline-1 outline outline-n-container rounded-xl bg-n-solid-2 px-6 py-5">
            <span className="text-sm font-medium text-n-slate-11">{t('CSAT_REPORTS.METRIC.RATING_DISTRIBUTION')}</span>

            {isLoading ? (
                <div className="mt-4">
                    <div className="h-6 w-full rounded-full bg-n-slate-3 animate-pulse" />
                    <div className="flex gap-6 mt-4">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div key={index} className="h-4 w-20 rounded bg-n-slate-3 animate-pulse" />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-4">
                    {totalResponseCount ? (
                        <VizPercentageChart
                            data={chartData}
                            ariaLabel={t('CSAT_REPORTS.METRIC.RATING_DISTRIBUTION')}
                            renderLegendItem={segment => (
                                <>
                                    <span className="text-sm text-n-slate-11">{segment.label}</span>
                                    <span className="text-sm font-medium text-n-slate-12">
                                        {segment.formattedPercentage}
                                    </span>
                                    <span className="text-xs text-n-slate-10">({segment.formattedValue})</span>
                                </>
                            )}
                        />
                    ) : (
                        <div className="h-6 w-full rounded bg-n-alpha-2" />
                    )}
                </div>
            )}
        </div>
    );
}
