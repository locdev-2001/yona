import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';

import './viz.css';
import { createBarLayout, type BarLayoutOptions } from './barLayout';
import {
    createCartesianItemPayload,
    type Accessor,
    type CartesianItemPayload,
    type StepSize,
    type ValueFormatter,
} from './cartesianLayout';

// Port từ @chatwoot/viz@0.1.5 src/components/cartesian/BarChart.vue.

export interface VizBarChartProps {
    ariaLabel?: string;
    barGap?: number;
    barRadius?: number;
    categoryLabel?: (category: unknown, index: number) => unknown;
    data: { categories?: unknown[]; series?: unknown[] };
    formatValue?: ValueFormatter;
    height?: number;
    maxBarWidth?: number;
    onItemClick?: (payload: CartesianItemPayload) => void;
    pointDescription?: (point: unknown, index: number, series: unknown) => unknown;
    pointValue?: (point: unknown, index: number, series: unknown) => unknown;
    seriesColor?: Accessor<[unknown, number], string | undefined>;
    seriesId?: (series: unknown, index: number) => string | number | undefined;
    seriesLabel?: (series: unknown, index: number) => unknown;
    seriesValueColor?: Accessor<[unknown, number], string | undefined>;
    seriesValues?: Accessor<[unknown, number], unknown[]>;
    showTooltip?: boolean;
    showValues?: boolean;
    stacked?: boolean;
    timeseries?: boolean;
    width?: number;
    yDomain?: number[];
    yStepSize?: StepSize;
    yTickCount?: number;
    yTicks?: number[];
    className?: string;
}

const defaultCategoryLabel = (category: unknown) =>
    (category as { label?: unknown })?.label ?? category;
const defaultFormatValue: ValueFormatter = value => Number(value).toLocaleString();
const defaultPointDescription = (point: unknown) => (point as { description?: unknown })?.description;
const defaultPointValue = (point: unknown) =>
    typeof point === 'number'
        ? point
        : ((point as { value?: unknown; y?: unknown })?.value ?? (point as { y?: unknown })?.y);
const defaultSeriesColor = (series: unknown) => (series as { color?: string })?.color;
const defaultSeriesId = (series: unknown, index: number) => (series as { id?: string | number })?.id ?? index;
const defaultSeriesLabel = (series: unknown, index: number) => {
    const record = series as { label?: unknown; id?: unknown };
    return record?.label ?? record?.id ?? `Series ${index + 1}`;
};
const defaultSeriesValueColor = (series: unknown) => {
    const record = series as { valueColor?: string; labelColor?: string };
    return record?.valueColor ?? record?.labelColor;
};
const defaultSeriesValues = (series: unknown) => {
    const record = series as { data?: unknown[]; values?: unknown[] };
    return record?.data ?? record?.values ?? [];
};

interface ActiveBar {
    pointIndex: number;
    seriesIndex: number;
    x: number;
    y: number;
}

export default function VizBarChart({
    ariaLabel = 'Bar chart',
    barGap = 6,
    barRadius = 4,
    categoryLabel = defaultCategoryLabel,
    data,
    formatValue = defaultFormatValue,
    height = 360,
    maxBarWidth = 48,
    onItemClick,
    pointDescription = defaultPointDescription,
    pointValue = defaultPointValue,
    seriesColor = defaultSeriesColor,
    seriesId = defaultSeriesId,
    seriesLabel = defaultSeriesLabel,
    seriesValueColor = defaultSeriesValueColor,
    seriesValues = defaultSeriesValues,
    showTooltip = true,
    showValues = false,
    stacked = false,
    timeseries = false,
    width = 960,
    yDomain,
    yStepSize,
    yTickCount = 5,
    yTicks,
    className = '',
}: VizBarChartProps) {
    const chartRoot = useRef<HTMLDivElement>(null);
    const [measuredWidth, setMeasuredWidth] = useState(0);
    const [activeBar, setActiveBar] = useState<ActiveBar | null>(null);

    const chartWidth = Math.max(Math.round(measuredWidth || width), 280);

    const layoutOptions: BarLayoutOptions = {
        barGap,
        barRadius,
        categoryLabel,
        data,
        formatValue,
        height,
        maxBarWidth,
        pointDescription,
        pointValue,
        seriesColor,
        seriesId,
        seriesLabel,
        seriesValueColor,
        seriesValues,
        stacked,
        timeseries,
        width: chartWidth,
        yDomain,
        yStepSize,
        yTickCount,
        yTicks,
    };
    const layout = createBarLayout(layoutOptions);

    // ResizeObserver + requestAnimationFrame của bản gốc: đổi bề ngang thì đóng tooltip.
    useEffect(() => {
        const element = chartRoot.current;
        if (!element) return undefined;

        const updateWidth = (nextWidth?: number) => {
            if (Number.isFinite(nextWidth) && (nextWidth as number) > 0) {
                setMeasuredWidth(nextWidth as number);
                setActiveBar(null);
            }
        };

        updateWidth(element.getBoundingClientRect().width);
        if (typeof ResizeObserver === 'undefined') return undefined;

        let resizeFrame: number | undefined;
        const observer = new ResizeObserver(entries => {
            const nextWidth = entries[0]?.contentRect.width;
            if (typeof requestAnimationFrame === 'undefined') {
                updateWidth(nextWidth);
                return;
            }
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
                resizeFrame = undefined;
                updateWidth(nextWidth);
            });
        });
        observer.observe(element);

        return () => {
            observer.disconnect();
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
        };
    }, []);

    const description = layout.error
        ? layout.error
        : `${layout.series.length} ${stacked ? 'stacked' : 'grouped'} series across ${layout.categories.length} categories.`;

    const tooltip = useMemo(() => {
        if (!showTooltip || !activeBar) return null;

        const anchorSeries = layout.series[activeBar.seriesIndex];
        const anchorPoint = anchorSeries?.points[activeBar.pointIndex];
        if (!anchorPoint) return null;

        return {
            category: anchorPoint.category.label,
            horizontalPosition:
                anchorPoint.centerX < chartWidth * 0.25
                    ? 'start'
                    : anchorPoint.centerX > chartWidth * 0.75
                      ? 'end'
                      : 'center',
            rows: layout.series.flatMap(series => {
                const point = series.points[activeBar.pointIndex];
                if (!point) return [];

                return [
                    {
                        color: series.color,
                        description: point.description,
                        formattedValue: point.formattedValue,
                        id: series.id,
                        isActive: series.index === activeBar.seriesIndex,
                        label: series.label,
                    },
                ];
            }),
            showBelow: anchorPoint.anchorY < height * 0.3,
            x: activeBar.x,
            y: activeBar.y,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTooltip, activeBar, layout, chartWidth, height]);

    const openTooltip = useCallback(
        (seriesIndex: number, pointIndex: number, event: PointerEvent<SVGGElement> | FocusEvent<SVGGElement>) => {
            if (!showTooltip) return;

            const rootBounds = chartRoot.current?.getBoundingClientRect();
            const target = event.currentTarget as SVGGraphicsElement | null;
            const matrix = target?.getScreenCTM?.();
            const point = layout.series[seriesIndex]?.points[pointIndex];
            if (!rootBounds || !point) return;

            setActiveBar({
                pointIndex,
                seriesIndex,
                x: matrix ? matrix.e - rootBounds.left : (point.centerX / chartWidth) * rootBounds.width,
                y: matrix ? matrix.f - rootBounds.top : (point.anchorY / height) * rootBounds.height,
            });
        },
        [showTooltip, layout, chartWidth, height],
    );

    const closeTooltip = useCallback(() => setActiveBar(null), []);

    const handleItemClick = (seriesIndex: number, pointIndex: number, event: unknown) => {
        if (!onItemClick) return;

        const series = layout.series[seriesIndex];
        const point = series?.points[pointIndex];
        if (!series || !point) return;

        onItemClick(createCartesianItemPayload(series, point, event));
    };

    const handleItemKeydown = (seriesIndex: number, pointIndex: number, event: KeyboardEvent<SVGGElement>) => {
        if (!onItemClick || !['Enter', ' '].includes(event.key)) return;

        event.preventDefault();
        handleItemClick(seriesIndex, pointIndex, event);
    };

    const tooltipClasses = tooltip
        ? [
              'cw-viz-bar__tooltip',
              `cw-viz-bar__tooltip--${tooltip.horizontalPosition}`,
              tooltip.showBelow ? 'cw-viz-bar__tooltip--below' : '',
          ]
              .filter(Boolean)
              .join(' ')
        : '';

    return (
        <div ref={chartRoot} className={`cw-viz-bar ${className}`.trim()}>
            <svg
                className="cw-viz-bar__svg"
                viewBox={`0 0 ${chartWidth} ${height}`}
                role="img"
                aria-label={ariaLabel}
                preserveAspectRatio="xMidYMid meet"
            >
                <desc>{description}</desc>

                {layout.error || !layout.series.length ? (
                    <text className="cw-viz-bar__empty" x="50%" y="50%" textAnchor="middle">
                        {layout.error || 'No bar data to display.'}
                    </text>
                ) : (
                    <g>
                        <g className="cw-viz-bar__axes" data-viz-layer="axes">
                            <line
                                className="cw-viz-bar__axis"
                                x1={layout.plot.left}
                                x2={layout.plot.left}
                                y1={layout.plot.top}
                                y2={layout.plot.bottom}
                            />
                            <line
                                className="cw-viz-bar__axis"
                                x1={layout.plot.left}
                                x2={layout.plot.right}
                                y1={layout.plot.bottom}
                                y2={layout.plot.bottom}
                            />
                            {Math.abs(layout.zeroY - (layout.plot.bottom as number)) > 0.5 && (
                                <line
                                    className="cw-viz-bar__zero-line"
                                    x1={layout.plot.left}
                                    x2={layout.plot.right}
                                    y1={layout.zeroY}
                                    y2={layout.zeroY}
                                />
                            )}

                            {layout.yTicks.map(tick => (
                                <g key={tick.value} className="cw-viz-bar__y-tick" transform={`translate(0 ${tick.y})`}>
                                    <line
                                        className="cw-viz-bar__tick-mark"
                                        x1={(layout.plot.left as number) - 9}
                                        x2={layout.plot.left}
                                        y1="0"
                                        y2="0"
                                    />
                                    <text
                                        className="cw-viz-bar__axis-label cw-viz-bar__axis-label--y"
                                        x={(layout.plot.left as number) - 14}
                                        y="0"
                                        dominantBaseline="central"
                                        textAnchor="end"
                                    >
                                        {tick.formattedValue}
                                    </text>
                                </g>
                            ))}

                            {layout.categories
                                .filter(category => category.showLabel)
                                .map(category => (
                                    <g
                                        key={category.index}
                                        className="cw-viz-bar__x-tick"
                                        transform={`translate(${category.x} ${layout.plot.bottom})`}
                                    >
                                        <line className="cw-viz-bar__tick-mark" x1="0" x2="0" y1="0" y2="10" />
                                        <text
                                            className="cw-viz-bar__axis-label cw-viz-bar__axis-label--x"
                                            x="0"
                                            y="30"
                                            textAnchor="middle"
                                        >
                                            {category.displayLabel}
                                        </text>
                                    </g>
                                ))}
                        </g>

                        <g className="cw-viz-bar__series-layer" data-viz-layer="series">
                            {layout.series.map(series => (
                                <g key={series.id} className="cw-viz-bar__series" data-series-id={series.id}>
                                    {series.points
                                        .filter((point): point is NonNullable<typeof point> => Boolean(point))
                                        .map(point => (
                                            <g
                                                key={point.index}
                                                className={`cw-viz-bar__bar-group${onItemClick ? ' cw-viz-bar__bar-group--clickable' : ''}`}
                                                transform={`translate(${point.centerX} ${point.anchorY})`}
                                                data-point-index={point.index}
                                                tabIndex={showTooltip || onItemClick ? 0 : undefined}
                                                role={onItemClick ? 'button' : undefined}
                                                aria-label={`${series.label}, ${point.category.label}: ${point.formattedValue}${point.description ? `. ${point.description}` : ''}`}
                                                onClick={event => handleItemClick(series.index, point.index, event)}
                                                onKeyDown={event => handleItemKeydown(series.index, point.index, event)}
                                                onPointerEnter={event => openTooltip(series.index, point.index, event)}
                                                onPointerLeave={closeTooltip}
                                                onFocus={event => openTooltip(series.index, point.index, event)}
                                                onBlur={closeTooltip}
                                            >
                                                <path className="cw-viz-bar__bar" d={point.path} fill={series.color} />
                                                {showValues && point.height > 0 && (
                                                    <text
                                                        className={`cw-viz-bar__value${point.labelInside ? ' cw-viz-bar__value--inside' : ''}`}
                                                        x="0"
                                                        y={point.labelY}
                                                        fill={point.labelInside ? undefined : series.valueColor}
                                                        dominantBaseline="central"
                                                        textAnchor="middle"
                                                    >
                                                        {point.formattedValue}
                                                    </text>
                                                )}
                                            </g>
                                        ))}
                                </g>
                            ))}
                        </g>
                    </g>
                )}
            </svg>

            {tooltip && (
                <div
                    className={tooltipClasses}
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` } as CSSProperties}
                    role="tooltip"
                >
                    <p className="cw-viz-bar__tooltip-title">{tooltip.category}</p>
                    <div className="cw-viz-bar__tooltip-list">
                        {tooltip.rows.map(row => (
                            <div
                                key={row.id}
                                className={`cw-viz-bar__tooltip-row${row.isActive ? ' cw-viz-bar__tooltip-row--active' : ''}`}
                            >
                                <span className="cw-viz-bar__tooltip-swatch" style={{ backgroundColor: row.color }} />
                                <span className="cw-viz-bar__tooltip-label">{row.label}</span>
                                <strong className="cw-viz-bar__tooltip-value">{row.formattedValue}</strong>
                                {row.description && (
                                    <span className="cw-viz-bar__tooltip-description">{row.description}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
