import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent, ReactNode } from 'react';

import './viz.css';
import { createPercentageLayout, type AggregateSegment } from './aggregateLayout';
import type { Accessor, ValueFormatter } from './cartesianLayout';

// Port từ thư viện biểu đồ viz@0.1.5 src/components/percentage/PercentageChart.vue.

export interface PercentageItemPayload {
    event: unknown;
    formattedPercentage: string;
    formattedValue: string;
    description: string;
    id: string;
    index: number;
    isRemainder: boolean;
    item: unknown;
    itemType: 'remainder' | 'segment';
    label: string;
    percentage: number;
    value: number;
}

export interface VizPercentageChartProps {
    ariaLabel?: string;
    barGap?: number;
    barHeight?: number;
    barRadius?: number;
    data: { segments?: unknown[]; total?: number | null };
    formatPercentage?: ValueFormatter;
    formatValue?: ValueFormatter;
    onItemClick?: (payload: PercentageItemPayload) => void;
    remainderColor?: string;
    remainderLabel?: string;
    segmentColor?: Accessor<[unknown, number], string | undefined>;
    segmentId?: (segment: unknown, index: number) => string | number | undefined;
    segmentLabel?: (segment: unknown, index: number) => unknown;
    segmentValue?: (segment: unknown, index: number) => unknown;
    showLegend?: boolean;
    showTooltip?: boolean;
    renderLegendItem?: (segment: AggregateSegment) => ReactNode;
    className?: string;
}

const defaultFormatValue: ValueFormatter = value => Number(value).toLocaleString();
const defaultSegmentColor = (segment: unknown) => (segment as { color?: string })?.color;
const defaultSegmentId = (segment: unknown, index: number) => (segment as { id?: string | number })?.id ?? index;
const defaultSegmentLabel = (segment: unknown, index: number) => {
    const record = segment as { label?: unknown; id?: unknown };
    return record?.label ?? record?.id ?? `Segment ${index + 1}`;
};
const defaultSegmentValue = (segment: unknown) =>
    typeof segment === 'number'
        ? segment
        : ((segment as { value?: unknown; count?: unknown })?.value ?? (segment as { count?: unknown })?.count);

interface ActiveTooltip {
    horizontalPosition: 'start' | 'center' | 'end';
    description: string;
    label: string;
    segmentIndex: number;
    value: string;
    x: number;
    y: number;
}

export default function VizPercentageChart({
    ariaLabel = 'Percentage chart',
    barGap = 2,
    barHeight = 24,
    barRadius = 4,
    data,
    formatPercentage = '%',
    formatValue = defaultFormatValue,
    onItemClick,
    remainderColor = 'var(--cw-viz-percentage-remainder-color, #f0f0f3)',
    remainderLabel = 'Unused',
    segmentColor = defaultSegmentColor,
    segmentId = defaultSegmentId,
    segmentLabel = defaultSegmentLabel,
    segmentValue = defaultSegmentValue,
    showLegend = true,
    showTooltip = true,
    renderLegendItem,
    className = '',
}: VizPercentageChartProps) {
    const chartRoot = useRef<HTMLDivElement>(null);
    const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);

    const layout = createPercentageLayout({
        data,
        formatPercentage,
        formatValue,
        remainderColor,
        remainderLabel,
        segmentColor,
        segmentId,
        segmentLabel,
        segmentValue,
    });

    const closeTooltip = useCallback(() => setActiveTooltip(null), []);

    // `watch(layout, closeTooltip)` của bản gốc: dữ liệu đổi thì bỏ tooltip đang mở.
    const layoutKey = layout.segments.map(segment => `${segment.key}:${segment.value}`).join('|');
    useEffect(() => {
        closeTooltip();
    }, [layoutKey, closeTooltip]);

    const rootStyle = {
        '--cw-viz-percentage-bar-gap': `${Math.max(barGap, 0)}px`,
        '--cw-viz-percentage-bar-height': `${Math.max(barHeight, 1)}px`,
        '--cw-viz-percentage-bar-radius': `${Math.max(barRadius, 0)}px`,
    } as CSSProperties;

    const barSegments = layout.segments.filter(segment => segment.percentage > 0);
    const tooltip = showTooltip ? activeTooltip : null;
    const description = layout.error
        ? layout.error
        : layout.segments
              .map(
                  segment =>
                      `${segment.label}: ${segment.tooltipValue}${segment.description ? `. ${segment.description}` : ''}`,
              )
              .join(', ');

    const openTooltip = (segment: AggregateSegment, event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        if (!showTooltip) return;

        const rootBounds = chartRoot.current?.getBoundingClientRect();
        const segmentBounds = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
        if (!rootBounds || !segmentBounds) return;

        const x = segmentBounds.left - rootBounds.left + segmentBounds.width / 2;
        setActiveTooltip({
            horizontalPosition: x < rootBounds.width * 0.25 ? 'start' : x > rootBounds.width * 0.75 ? 'end' : 'center',
            description: segment.description,
            label: segment.label,
            segmentIndex: segment.index,
            value: segment.tooltipValue,
            x,
            y: segmentBounds.top - rootBounds.top,
        });
    };

    const selectSegment = (segment: AggregateSegment, event: unknown) => {
        if (!onItemClick) return;

        onItemClick({
            event,
            formattedPercentage: segment.formattedPercentage,
            formattedValue: segment.formattedValue,
            description: segment.description,
            id: segment.id,
            index: segment.index,
            isRemainder: segment.isRemainder,
            item: segment.datum,
            itemType: segment.isRemainder ? 'remainder' : 'segment',
            label: segment.label,
            percentage: segment.percentage,
            value: segment.value,
        });
    };

    const interactive = showTooltip || Boolean(onItemClick);

    return (
        <div
            ref={chartRoot}
            className={`cw-viz-percentage ${className}`.trim()}
            style={rootStyle}
            role="group"
            aria-label={ariaLabel}
        >
            <p className="cw-viz-percentage__description">{description}</p>

            {layout.error ? (
                <p className="cw-viz-percentage__empty">{layout.error}</p>
            ) : (
                <>
                    <div className="cw-viz-percentage__bar">
                        {barSegments.map(segment => {
                            const style = {
                                '--cw-viz-percentage-segment-color': segment.color,
                                '--cw-viz-percentage-segment-size': segment.percentage,
                            } as CSSProperties;
                            const segmentClass = `cw-viz-percentage__segment${segment.isRemainder ? ' cw-viz-percentage__segment--remainder' : ''}`;
                            const label = `${segment.label}: ${segment.tooltipValue}${segment.description ? `. ${segment.description}` : ''}`;

                            return interactive ? (
                                <button
                                    key={segment.key}
                                    type="button"
                                    className={segmentClass}
                                    style={style}
                                    aria-label={label}
                                    onPointerEnter={event => openTooltip(segment, event)}
                                    onPointerLeave={closeTooltip}
                                    onFocus={event => openTooltip(segment, event)}
                                    onBlur={closeTooltip}
                                    onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                                        if (event.key === 'Escape') closeTooltip();
                                    }}
                                    onClick={event => selectSegment(segment, event)}
                                />
                            ) : (
                                <span key={segment.key} className={segmentClass} style={style} aria-label={label} />
                            );
                        })}
                    </div>

                    {tooltip && (
                        <div
                            className={`cw-viz-percentage__tooltip cw-viz-percentage__tooltip--${tooltip.horizontalPosition}`}
                            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                            role="tooltip"
                        >
                            <div className="cw-viz-percentage__tooltip-main">
                                <span>{tooltip.label}</span>
                                <strong>{tooltip.value}</strong>
                            </div>
                            {tooltip.description && (
                                <span className="cw-viz-percentage__tooltip-description">{tooltip.description}</span>
                            )}
                        </div>
                    )}

                    {showLegend && (
                        <ul className="cw-viz-percentage__legend">
                            {layout.segments.map(segment => (
                                <li
                                    key={segment.key}
                                    className={segment.isRemainder ? 'cw-viz-percentage__legend-item--remainder' : undefined}
                                >
                                    {renderLegendItem ? (
                                        renderLegendItem(segment)
                                    ) : (
                                        <>
                                            <span
                                                className={`cw-viz-percentage__swatch${segment.isRemainder ? ' cw-viz-percentage__swatch--remainder' : ''}`}
                                                style={{ '--cw-viz-percentage-segment-color': segment.color } as CSSProperties}
                                                aria-hidden="true"
                                            />
                                            <span>{segment.label}</span>
                                            <strong>{segment.formattedPercentage}</strong>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
