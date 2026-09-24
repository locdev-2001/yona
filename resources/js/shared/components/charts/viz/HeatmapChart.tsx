import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from 'react';

import './viz.css';
import { createHeatmapLayout, type HeatmapCell, type HeatmapRow } from './heatmapLayout';
import type { ValueFormatter } from './cartesianLayout';

// Port từ thư viện biểu đồ viz@0.1.5 src/components/heatmap/HeatmapChart.vue.

const DEFAULT_LEVEL_COLORS = [
    'var(--cw-viz-heatmap-level-0-color, #f8f8fa)',
    'var(--cw-viz-heatmap-level-1-color, #e2efff)',
    'var(--cw-viz-heatmap-level-2-color, #bdd9fb)',
    'var(--cw-viz-heatmap-level-3-color, #8ab6f0)',
    'var(--cw-viz-heatmap-level-4-color, #1c73dc)',
];

export interface HeatmapItemPayload {
    column: unknown;
    columnId: string;
    columnIndex: number;
    columnLabel: string;
    event: unknown;
    formattedValue: string;
    item: unknown;
    itemType: 'cell';
    row: unknown;
    rowDescription: string;
    rowId: string;
    rowIndex: number;
    rowLabel: string;
    value: number | undefined;
}

export interface VizHeatmapChartProps {
    ariaLabel?: string;
    cellHeight?: number;
    cellMinWidth?: number;
    colors?: string[];
    data: { columns?: unknown[]; rows?: unknown[] };
    domain?: number[];
    formatValue?: ValueFormatter;
    gap?: number;
    onItemClick?: (payload: HeatmapItemPayload) => void;
    quantiles?: number[];
    rowLabelWidth?: number;
    showTooltip?: boolean;
    zeroColor?: string;
    className?: string;
}

interface ActiveCell {
    columnIndex: number;
    rowIndex: number;
    horizontalPosition: 'start' | 'center' | 'end';
    showBelow: boolean;
    x: number;
    y: number;
}

export default function VizHeatmapChart({
    ariaLabel = 'Heatmap chart',
    cellHeight = 32,
    cellMinWidth = 28,
    colors,
    data,
    domain,
    formatValue,
    gap = 4,
    onItemClick,
    quantiles,
    rowLabelWidth = 120,
    showTooltip = true,
    zeroColor,
    className = '',
}: VizHeatmapChartProps) {
    const chartRoot = useRef<HTMLDivElement>(null);
    const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);

    const palette = useMemo(() => {
        const list = Array.isArray(colors) ? colors.filter(color => typeof color === 'string' && color.trim()) : [];
        return list.length ? list : DEFAULT_LEVEL_COLORS;
    }, [colors]);
    const resolvedZeroColor = typeof zeroColor === 'string' && zeroColor.trim() ? zeroColor : undefined;

    const layout = createHeatmapLayout({
        data,
        domain,
        excludeZeroFromQuantiles: resolvedZeroColor !== undefined,
        formatValue,
        levelCount: palette.length,
        quantiles,
    });

    const gridStyle = {
        '--cw-viz-heatmap-cell-height': `${Math.max(cellHeight, 1)}px`,
        '--cw-viz-heatmap-cell-min-width': `${Math.max(cellMinWidth, 1)}px`,
        '--cw-viz-heatmap-column-count': layout.columns.length,
        '--cw-viz-heatmap-gap': `${Math.max(gap, 0)}px`,
        '--cw-viz-heatmap-grid-min-width': `${Math.max(rowLabelWidth, 1) + layout.columns.length * Math.max(cellMinWidth, 1) + layout.columns.length * Math.max(gap, 0)}px`,
        '--cw-viz-heatmap-row-label-width': `${Math.max(rowLabelWidth, 1)}px`,
    } as CSSProperties;

    const description = layout.error
        ? layout.error
        : `${layout.rows.length} rows across ${layout.columns.length} columns.`;

    const tooltip = useMemo(() => {
        if (!showTooltip || !activeCell) return null;

        const row = layout.rows[activeCell.rowIndex];
        const cell = row?.cells[activeCell.columnIndex];
        if (!row || cell?.value === undefined) return null;

        return {
            column: cell.column.label,
            formattedValue: cell.formattedValue,
            horizontalPosition: activeCell.horizontalPosition,
            rowDescription: row.description,
            rowLabel: row.label,
            showBelow: activeCell.showBelow,
            x: activeCell.x,
            y: activeCell.y,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTooltip, activeCell, layout]);

    const openTooltip = useCallback(
        (rowIndex: number, columnIndex: number, event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
            if (!showTooltip) return;

            const rootBounds = chartRoot.current?.getBoundingClientRect();
            const cellBounds = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
            if (!rootBounds || !cellBounds) return;

            const x = cellBounds.left - rootBounds.left + cellBounds.width / 2;
            const y = cellBounds.top - rootBounds.top + cellBounds.height / 2;
            setActiveCell({
                columnIndex,
                horizontalPosition:
                    x < rootBounds.width * 0.25 ? 'start' : x > rootBounds.width * 0.75 ? 'end' : 'center',
                rowIndex,
                showBelow: y < 96,
                x,
                y,
            });
        },
        [showTooltip],
    );

    const closeTooltip = useCallback(() => setActiveCell(null), []);

    const cellStyle = (cell: HeatmapCell): CSSProperties => {
        if (cell.color) return { backgroundColor: cell.color };
        if (cell.value === 0 && resolvedZeroColor) return { backgroundColor: resolvedZeroColor };
        return { backgroundColor: palette[cell.level as number] };
    };

    const selectCell = (row: HeatmapRow, cell: HeatmapCell, event: unknown) => {
        if (!onItemClick) return;

        onItemClick({
            column: cell.column.datum,
            columnId: cell.column.id,
            columnIndex: cell.column.index,
            columnLabel: cell.column.label,
            event,
            formattedValue: cell.formattedValue,
            item: cell.datum,
            itemType: 'cell',
            row: row.datum,
            rowDescription: row.description,
            rowId: row.id,
            rowIndex: row.index,
            rowLabel: row.label,
            value: cell.value,
        });
    };

    const interactive = showTooltip || Boolean(onItemClick);

    return (
        <div ref={chartRoot} className={`cw-viz-heatmap ${className}`.trim()} role="group" aria-label={ariaLabel}>
            <p className="cw-viz-heatmap__description">{description}</p>

            {layout.error ? (
                <p className="cw-viz-heatmap__empty">{layout.error}</p>
            ) : (
                <div className="cw-viz-heatmap__scroll">
                    <div className="cw-viz-heatmap__grid" style={gridStyle} role="grid">
                        {layout.rows.map(row => (
                            <div key={row.id} className="cw-viz-heatmap__row" role="row">
                                <div className="cw-viz-heatmap__row-label" role="rowheader">
                                    <strong>{row.label}</strong>
                                    {row.description && <span>{row.description}</span>}
                                </div>

                                {row.cells.map(cell =>
                                    cell.value !== undefined ? (
                                        interactive ? (
                                            <button
                                                key={cell.id}
                                                type="button"
                                                className={`cw-viz-heatmap__cell cw-viz-heatmap__cell--level-${cell.level}`}
                                                style={cellStyle(cell)}
                                                role="gridcell"
                                                aria-label={`${row.label}, ${cell.column.label}: ${cell.formattedValue}`}
                                                onPointerEnter={event => openTooltip(row.index, cell.column.index, event)}
                                                onPointerLeave={closeTooltip}
                                                onFocus={event => openTooltip(row.index, cell.column.index, event)}
                                                onBlur={closeTooltip}
                                                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                                                    if (event.key === 'Escape') closeTooltip();
                                                }}
                                                onClick={event => selectCell(row, cell, event)}
                                            />
                                        ) : (
                                            <span
                                                key={cell.id}
                                                className={`cw-viz-heatmap__cell cw-viz-heatmap__cell--level-${cell.level}`}
                                                style={cellStyle(cell)}
                                                role="gridcell"
                                                aria-label={`${row.label}, ${cell.column.label}: ${cell.formattedValue}`}
                                            />
                                        )
                                    ) : (
                                        <span
                                            key={cell.id}
                                            className="cw-viz-heatmap__cell cw-viz-heatmap__cell--empty"
                                            role="gridcell"
                                        />
                                    ),
                                )}
                            </div>
                        ))}

                        <div className="cw-viz-heatmap__row cw-viz-heatmap__header-row" role="row">
                            <span aria-hidden="true" />
                            {layout.columns.map(column => (
                                <span key={column.id} className="cw-viz-heatmap__column-label" role="columnheader">
                                    {column.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {tooltip && (
                <div
                    className={[
                        'cw-viz-heatmap__tooltip',
                        `cw-viz-heatmap__tooltip--${tooltip.horizontalPosition}`,
                        tooltip.showBelow ? 'cw-viz-heatmap__tooltip--below' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                    role="tooltip"
                >
                    <p className="cw-viz-heatmap__tooltip-title">
                        {tooltip.rowLabel}
                        {tooltip.rowDescription && <span>{tooltip.rowDescription}</span>}
                    </p>
                    <div className="cw-viz-heatmap__tooltip-row">
                        <span>{tooltip.column}</span>
                        <strong>{tooltip.formattedValue}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}
