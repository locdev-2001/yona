import { useMemo } from 'react';
import { format, getDay } from 'date-fns';

import VizHeatmapChart from 'shared/components/charts/viz/HeatmapChart';
import { groupHeatmapByDay, type HeatmapPoint } from 'shared/helpers/reportsDataHelper';
import { t } from '../../../../i18n';

// Port từ reports/components/heatmaps/BaseHeatmap.vue

const QUANTILES = [0.2, 0.4, 0.6, 0.8, 0.9, 0.99];

const COLOR_SCHEMES: Record<string, string[]> = {
    blue: [
        'rgb(var(--blue-3))',
        'rgb(var(--blue-5))',
        'rgb(var(--blue-7))',
        'rgb(var(--blue-8))',
        'rgb(var(--blue-9))',
        'rgb(var(--blue-10))',
        'rgb(var(--blue-11))',
    ],
    green: [
        'rgb(var(--teal-3))',
        'rgb(var(--teal-5))',
        'rgb(var(--teal-7))',
        'rgb(var(--teal-8))',
        'rgb(var(--teal-9))',
        'rgb(var(--teal-10))',
        'rgb(var(--teal-11))',
    ],
};

const VIZ_THEME_CLASS =
    '[--cw-viz-heatmap-level-0-color:rgb(var(--slate-2))] [--cw-viz-heatmap-cell-border-color:rgb(var(--border-strong))] [--cw-viz-heatmap-label-color:rgb(var(--slate-11))] [--cw-viz-heatmap-label-background:rgb(var(--solid-2))] [--cw-viz-heatmap-row-title-color:rgb(var(--slate-12))] [--cw-viz-heatmap-column-label-color:rgb(var(--slate-12))] [--cw-viz-heatmap-tooltip-border-color:rgb(var(--border-strong))] [--cw-viz-heatmap-tooltip-color:rgb(var(--slate-12))] [--cw-viz-heatmap-tooltip-background:rgb(var(--solid-2))] [--cw-viz-heatmap-tooltip-label-color:rgb(var(--slate-11))]';

const columns = Array.from({ length: 24 }, (_, hour) => ({
    id: hour,
    label: `${String(hour).padStart(2, '0')}:00`,
}));

interface BaseHeatmapProps {
    heatmapData: HeatmapPoint[];
    numberOfRows?: number;
    isLoading?: boolean;
    colorScheme?: 'blue' | 'green';
    ariaLabel: string;
    formatValue: (value: number) => string;
}

export default function BaseHeatmap({
    heatmapData = [],
    numberOfRows = 7,
    isLoading = false,
    colorScheme = 'blue',
    ariaLabel,
    formatValue,
}: BaseHeatmapProps) {
    const daysOfWeek = [
        t('DAYS_OF_WEEK.SUNDAY'),
        t('DAYS_OF_WEEK.MONDAY'),
        t('DAYS_OF_WEEK.TUESDAY'),
        t('DAYS_OF_WEEK.WEDNESDAY'),
        t('DAYS_OF_WEEK.THURSDAY'),
        t('DAYS_OF_WEEK.FRIDAY'),
        t('DAYS_OF_WEEK.SATURDAY'),
    ];

    const chartData = useMemo(() => {
        const groupedData = groupHeatmapByDay(heatmapData);
        const rows = Array.from(groupedData.entries()).map(([dateKey, rowData]) => {
            const valuesByHour = new Map(rowData.map(item => [item.hour, item]));
            const date = new Date(dateKey);

            return {
                id: dateKey,
                label: daysOfWeek[getDay(date)],
                description: format(new Date(dateKey), 'MMM d, yyyy'),
                data: columns.map(({ id }) => valuesByHour.get(id) ?? null),
            };
        });

        return { columns, rows };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heatmapData]);

    if (isLoading) {
        return (
            <div className="grid relative w-full gap-x-4 gap-y-2.5 overflow-y-scroll md:overflow-visible grid-cols-[5rem_1fr]">
                <div className="grid gap-[0.3125rem] flex-shrink-0">
                    {Array.from({ length: numberOfRows }, (_, index) => (
                        <div
                            key={index}
                            className="w-full rounded-sm bg-n-slate-3 dark:bg-n-slate-1 animate-loader-pulse h-8 min-w-[4.375rem]"
                        />
                    ))}
                </div>
                <div className="grid gap-[0.3125rem] w-full min-w-[43.75rem]">
                    {Array.from({ length: numberOfRows }, (_, rowIndex) => (
                        <div key={rowIndex} className="grid gap-[0.3125rem] grid-cols-[repeat(24,_1fr)]">
                            {Array.from({ length: 24 }, (_, cellIndex) => (
                                <div
                                    key={cellIndex}
                                    className="w-full h-8 rounded-sm bg-n-slate-3 dark:bg-n-slate-1 animate-loader-pulse"
                                />
                            ))}
                        </div>
                    ))}
                </div>
                <div />
                <div className="grid grid-cols-[repeat(24,_1fr)] gap-[0.3125rem] w-full text-xxxs font-semibold h-5 text-n-slate-11">
                    {Array.from({ length: 24 }, (_, index) => (
                        <div key={index} className="flex items-center justify-center">
                            {index}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <VizHeatmapChart
            data={chartData}
            ariaLabel={ariaLabel}
            colors={COLOR_SCHEMES[colorScheme]}
            formatValue={value => formatValue(value)}
            quantiles={QUANTILES}
            cellMinWidth={24}
            gap={5}
            rowLabelWidth={96}
            zeroColor="rgb(var(--solid-2))"
            className={`${VIZ_THEME_CLASS} ${
                colorScheme === 'green'
                    ? '[--cw-viz-heatmap-focus-color:rgb(var(--teal-9))]'
                    : '[--cw-viz-heatmap-focus-color:rgb(var(--blue-9))]'
            }`}
        />
    );
}
