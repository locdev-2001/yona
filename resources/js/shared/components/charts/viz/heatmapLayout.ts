// Port từ thư viện biểu đồ viz@0.1.5 src/components/heatmap/heatmap-layout.js.

import { finiteNumber, formatChartValue, type ValueFormatter } from './cartesianLayout';

function accessorValue<TResult>(
    accessor: TResult | ((...args: unknown[]) => TResult),
    fallback: TResult,
    ...args: unknown[]
): TResult {
    if (typeof accessor === 'function') return (accessor as (...inner: unknown[]) => TResult)(...args);
    return accessor ?? fallback;
}

function normalizeDomain(
    minimum: number | undefined,
    maximum: number | undefined,
    requestedDomain: number[] | undefined,
): [number, number] {
    const requestedMinimum = finiteNumber(requestedDomain?.[0]);
    const requestedMaximum = finiteNumber(requestedDomain?.[1]);

    if (requestedMinimum !== undefined && requestedMaximum !== undefined) {
        return [
            Math.min(requestedMinimum, requestedMaximum),
            Math.max(requestedMinimum, requestedMaximum),
        ];
    }

    if (minimum === undefined || maximum === undefined) return [0, 1];
    return [minimum, maximum];
}

function normalizeQuantiles(quantiles: number[] | undefined): number[] {
    if (!Array.isArray(quantiles)) return [];

    return [
        ...new Set(
            quantiles
                .map(value => finiteNumber(value))
                .filter((value): value is number => value !== undefined && value >= 0 && value <= 1),
        ),
    ].sort((first, second) => first - second);
}

function quantileForSorted(sorted: number[], quantile: number): number {
    const position = (sorted.length - 1) * quantile;
    const lowerIndex = Math.floor(position);
    const interpolation = position - lowerIndex;
    const lowerValue = sorted[lowerIndex];
    const upperValue = sorted[lowerIndex + 1];

    return upperValue === undefined ? lowerValue : lowerValue + interpolation * (upperValue - lowerValue);
}

function createQuantileThresholds(values: number[], quantiles: number[]): number[] {
    if (!values.length || !quantiles.length) return [];

    const sorted = [...values].sort((first, second) => first - second);
    return quantiles.map(quantile => quantileForSorted(sorted, quantile));
}

function colorLevel(
    value: number | undefined,
    domain: [number, number],
    levelCount: number,
    quantileThresholds: number[],
): number | undefined {
    if (value === undefined) return undefined;

    if (quantileThresholds.length) {
        const thresholdIndex = quantileThresholds.findIndex(threshold => value <= threshold);
        const level = thresholdIndex === -1 ? quantileThresholds.length : thresholdIndex;
        return Math.min(level, levelCount - 1);
    }

    const [minimum, maximum] = domain;
    if (minimum === maximum) return levelCount - 1;

    const ratio = Math.min(Math.max((value - minimum) / (maximum - minimum), 0), 1);
    return Math.min(Math.floor(ratio * levelCount), levelCount - 1);
}

function normalizeLevelCount(levelCount: number | undefined): number {
    return Math.max(Math.floor(finiteNumber(levelCount) ?? 5), 1);
}

function numericCellValue(value: unknown): number | undefined {
    return value === null || value === undefined ? undefined : finiteNumber(value);
}

export interface HeatmapColumn {
    datum: unknown;
    id: string;
    index: number;
    label: string;
}

export interface HeatmapCell {
    color?: string;
    column: HeatmapColumn;
    datum: unknown;
    formattedValue: string;
    id: string;
    value: number | undefined;
    level?: number;
}

export interface HeatmapRow {
    datum: unknown;
    description: string;
    id: string;
    index: number;
    label: string;
    values: unknown[];
    cells: HeatmapCell[];
}

export interface HeatmapLayout {
    columns: HeatmapColumn[];
    domain: [number, number];
    error: string;
    levelCount: number;
    quantileThresholds: number[];
    quantiles: number[];
    rows: HeatmapRow[];
}

export interface HeatmapLayoutOptions {
    cellColor?: string | ((...args: unknown[]) => string | undefined);
    cellValue?: (...args: unknown[]) => unknown;
    columnId?: (...args: unknown[]) => string | number;
    columnLabel?: (...args: unknown[]) => unknown;
    data: { columns?: unknown[]; rows?: unknown[] } | undefined;
    domain?: number[];
    excludeZeroFromQuantiles?: boolean;
    formatValue?: ValueFormatter;
    levelCount?: number;
    quantiles?: number[];
    rowDescription?: (...args: unknown[]) => unknown;
    rowId?: (...args: unknown[]) => string | number;
    rowLabel?: (...args: unknown[]) => unknown;
    rowValues?: (...args: unknown[]) => unknown[];
}

export function createHeatmapLayout({
    cellColor,
    cellValue,
    columnId,
    columnLabel,
    data,
    domain,
    excludeZeroFromQuantiles = false,
    formatValue,
    levelCount,
    quantiles,
    rowDescription,
    rowId,
    rowLabel,
    rowValues,
}: HeatmapLayoutOptions): HeatmapLayout {
    const sourceColumns = Array.isArray(data?.columns) ? data.columns : [];
    const sourceRows = Array.isArray(data?.rows) ? data.rows : [];
    const normalizedLevelCount = normalizeLevelCount(levelCount);
    const normalizedQuantiles = normalizeQuantiles(quantiles);

    const columns: HeatmapColumn[] = sourceColumns.map((column, index) => {
        const record = column as { id?: unknown; label?: unknown } | undefined;
        return {
            datum: column,
            id: String(accessorValue(columnId, (record?.id ?? index) as string | number, column, index)),
            index,
            label: String(accessorValue(columnLabel, (record?.label ?? column) as unknown, column, index) ?? ''),
        };
    });

    const normalizedRows = sourceRows.map((row, rowIndex) => {
        const record = row as
            | { data?: unknown[]; values?: unknown[]; description?: unknown; sublabel?: unknown; id?: unknown; label?: unknown }
            | undefined;
        const values = accessorValue(rowValues, (record?.data ?? record?.values ?? []) as unknown[], row, rowIndex);

        return {
            datum: row,
            description: String(
                accessorValue(rowDescription, (record?.description ?? record?.sublabel ?? '') as unknown, row, rowIndex) ?? '',
            ),
            id: String(accessorValue(rowId, (record?.id ?? rowIndex) as string | number, row, rowIndex)),
            index: rowIndex,
            label: String(accessorValue(rowLabel, (record?.label ?? record?.id ?? rowIndex) as unknown, row, rowIndex) ?? ''),
            values: Array.isArray(values) ? values : [],
        } as HeatmapRow;
    });

    let minimum: number | undefined;
    let maximum: number | undefined;
    const numericValues: number[] = [];
    const rows = normalizedRows.map(row => {
        row.cells = columns.map(column => {
            const datum = row.values[column.index] as { value?: unknown; count?: unknown; color?: string } | undefined;
            const value = numericCellValue(
                accessorValue(cellValue, (datum?.value ?? datum?.count ?? datum) as unknown, datum, row.datum, column.datum),
            );
            const color = accessorValue(
                cellColor,
                (typeof datum === 'object' && datum !== null ? datum.color : undefined) as string | undefined,
                datum,
                row.datum,
                column.datum,
            );

            if (value !== undefined) {
                minimum = minimum === undefined ? value : Math.min(minimum, value);
                maximum = maximum === undefined ? value : Math.max(maximum, value);
                if (normalizedQuantiles.length && (!excludeZeroFromQuantiles || value !== 0)) {
                    numericValues.push(value);
                }
            }

            return {
                color,
                column,
                datum,
                formattedValue: value === undefined ? '' : formatChartValue(formatValue, value, datum, row.datum),
                id: `${row.id}:${column.id}`,
                value,
            } as HeatmapCell;
        });

        return row;
    });
    const normalizedDomain = normalizeDomain(minimum, maximum, domain);
    const quantileThresholds = createQuantileThresholds(numericValues, normalizedQuantiles);

    for (const row of rows) {
        for (const cell of row.cells) {
            cell.level = colorLevel(cell.value, normalizedDomain, normalizedLevelCount, quantileThresholds);
        }
    }

    return {
        columns,
        domain: normalizedDomain,
        error: !columns.length || !rows.length ? 'Heatmap data requires at least one column and row.' : '',
        levelCount: normalizedLevelCount,
        quantileThresholds,
        quantiles: normalizedQuantiles,
        rows,
    };
}
