// Port từ thư viện biểu đồ viz@0.1.5 src/components/cartesian/cartesian-layout.js.
// Toàn bộ phép tính trục/thang đo giữ nguyên công thức để SVG khớp từng pixel.

const DEFAULT_TICK_COUNT = 5;
const AXIS_CHARACTER_WIDTH = 7;

export type Accessor<TArgs extends unknown[], TResult> = TResult | ((...args: TArgs) => TResult);
export type ValueFormatter =
    | string
    | ((value: number, datum?: unknown, series?: unknown) => unknown);

export function accessorValue<TResult>(
    accessor: Accessor<[unknown, number], TResult>,
    datum: unknown,
    index: number,
): TResult {
    return typeof accessor === 'function'
        ? (accessor as (datum: unknown, index: number) => TResult)(datum, index)
        : accessor;
}

export function formatChartValue(
    formatter: ValueFormatter | undefined,
    value: number,
    datum?: unknown,
    series?: unknown,
): string {
    const localeValue = Number(value).toLocaleString();

    if (typeof formatter === 'function') return String(formatter(value, datum, series));
    if (typeof formatter !== 'string') return localeValue;
    if (formatter.includes('{value}')) return formatter.replaceAll('{value}', localeValue);
    return `${localeValue}${formatter}`;
}

export interface CartesianItemPayload {
    category: unknown;
    categoryIndex: number;
    categoryLabel: string;
    event: unknown;
    formattedValue: string;
    item: unknown;
    pointIndex: number;
    series: unknown;
    seriesId: string | number;
    seriesIndex: number;
    seriesLabel: string;
    value: number;
}

export function createCartesianItemPayload(
    series: { datum: unknown; id: string | number; index: number; label: string },
    point: {
        category: { datum: unknown; index: number; label: string };
        formattedValue: string;
        datum: unknown;
        index: number;
        value: number;
    },
    event: unknown,
): CartesianItemPayload {
    return {
        category: point.category.datum,
        categoryIndex: point.category.index,
        categoryLabel: point.category.label,
        event,
        formattedValue: point.formattedValue,
        item: point.datum,
        pointIndex: point.index,
        series: series.datum,
        seriesId: series.id,
        seriesIndex: series.index,
        seriesLabel: series.label,
        value: point.value,
    };
}

function cssIdentifier(value: unknown): string {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function seriesCssColor(chart: string, id: string | number, index: number): string {
    const identifier = cssIdentifier(id);
    const fallbacks = ['#8b8d98', '#009688', '#3e63dd', '#915930', '#ca244e', '#7c66dc'];
    const fallback = fallbacks[index % fallbacks.length];
    const indexVariable = `var(--cw-viz-${chart}-series-${index}-color, ${fallback})`;

    return identifier
        ? `var(--cw-viz-${chart}-series-${identifier}-color, ${indexVariable})`
        : indexVariable;
}

export function trimAxisLabel(label: string, maximumWidth: number): string {
    const maximumCharacters = Math.max(Math.floor(maximumWidth / AXIS_CHARACTER_WIDTH), 1);
    if (label.length <= maximumCharacters) return label;
    if (maximumCharacters <= 1) return '…';
    return `${label.slice(0, maximumCharacters - 1).trimEnd()}…`;
}

export function finiteNumber(value: unknown, fallback?: number): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function decimalPlaces(value: number): number {
    if (!Number.isFinite(value)) return 0;

    const exponent = Math.floor(Math.log10(Math.abs(value) || 1));
    return Math.max(0, -exponent + 1);
}

function roundNumber(value: number, step: number): number {
    return Number(value.toFixed(decimalPlaces(step)));
}

function stepBoundary(value: number, step: number, direction: 'down' | 'up'): number {
    const quotient = value / step;
    const tolerance = Number.EPSILON * Math.max(Math.abs(quotient), 1) * 4;
    const roundedQuotient =
        direction === 'down' ? Math.floor(quotient + tolerance) : Math.ceil(quotient - tolerance);
    return roundNumber(roundedQuotient * step, step);
}

export function niceStep(span: number, tickCount: number = DEFAULT_TICK_COUNT): number {
    const intervals = Math.max(Math.floor(tickCount) - 1, 1);
    const roughStep = Math.abs(span) / intervals;

    if (!Number.isFinite(roughStep) || roughStep === 0) return 1;

    const power = 10 ** Math.floor(Math.log10(roughStep));
    const error = roughStep / power;
    const factor = error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1;
    return factor * power;
}

interface DomainDetails {
    domain: [number, number];
    isExplicit: boolean;
    values: number[];
    step?: number;
}

function createDomainDetails(
    values: Array<number | undefined>,
    requestedDomain: number[] | undefined,
    includeZero: boolean,
): DomainDetails {
    const requestedMinimum = finiteNumber(requestedDomain?.[0]);
    const requestedMaximum = finiteNumber(requestedDomain?.[1]);
    const validValues = values
        .map(value => finiteNumber(value))
        .filter((value): value is number => value !== undefined);

    if (requestedMinimum !== undefined && requestedMaximum !== undefined) {
        return {
            domain: [
                Math.min(requestedMinimum, requestedMaximum),
                Math.max(requestedMinimum, requestedMaximum),
            ],
            isExplicit: true,
            values: validValues,
        };
    }

    let minimum = validValues.length ? Math.min(...validValues) : 0;
    let maximum = validValues.length ? Math.max(...validValues) : 1;

    if (minimum === 0 && maximum === 0) maximum = 1;

    if (includeZero) {
        minimum = Math.min(minimum, 0);
        maximum = Math.max(maximum, 0);
    }

    return { domain: [minimum, maximum], isExplicit: false, values: validValues };
}

function paddedDomainSpan([minimum, maximum]: [number, number]): number {
    if (minimum !== maximum) return maximum - minimum;

    const padding = Math.abs(minimum || 1) * 0.1;
    return padding * 2;
}

export interface StepSizeContext {
    max: number;
    min: number;
    tickCount: number;
    values: number[];
}

export type StepSize = number | ((context: StepSizeContext) => number | undefined);

function resolveStepSize(stepSize: StepSize | undefined, context: StepSizeContext): number | undefined {
    const value = typeof stepSize === 'function' ? stepSize(context) : stepSize;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizeDomain(details: DomainDetails, step: number): DomainDetails {
    if (details.isExplicit) return { ...details, step };

    let [minimum, maximum] = details.domain;
    if (minimum === maximum) {
        const padding = Math.abs(minimum || 1) * 0.1;
        minimum -= padding;
        maximum += padding;
    }

    let domainMinimum = stepBoundary(minimum, step, 'down');
    let domainMaximum = stepBoundary(maximum, step, 'up');

    if (domainMinimum === domainMaximum) {
        domainMinimum = roundNumber(domainMinimum - step, step);
        domainMaximum = roundNumber(domainMaximum + step, step);
    }

    return {
        ...details,
        domain: [domainMinimum, domainMaximum],
        isExplicit: false,
        step,
    };
}

function createTicks(
    domainDetails: DomainDetails,
    requestedTicks: number[],
    tickCount: number,
    useStepSize: boolean,
): number[] {
    const [minimum, maximum] = domainDetails.domain;
    const explicitTicks = requestedTicks.filter(value => value >= minimum && value <= maximum);

    if (explicitTicks.length) return explicitTicks;

    if (domainDetails.isExplicit && !useStepSize) {
        if (minimum === maximum) return [minimum];

        const intervals = Math.max(Math.floor(tickCount) - 1, 1);
        const step = (maximum - minimum) / intervals;
        return Array.from({ length: intervals + 1 }, (_, index) =>
            roundNumber(minimum + step * index, step),
        );
    }

    const ticks: number[] = [];
    const step = domainDetails.step as number;
    const firstTick = stepBoundary(minimum, step, 'up');

    for (let value = firstTick; value <= maximum + step / 2; value += step) {
        ticks.push(roundNumber(value, step));
    }

    return ticks;
}

export interface BandScale {
    bandwidth: number;
    positions: number[];
    step: number;
}

export function createBandScale({
    count,
    end,
    paddingInner = 0,
    paddingOuter = 0,
    start,
}: {
    count: number;
    end: number;
    paddingInner?: number;
    paddingOuter?: number;
    start: number;
}): BandScale {
    const itemCount = Math.max(Math.floor(count), 0);
    const span = Math.max(end - start, 0);

    if (!itemCount) return { bandwidth: 0, positions: [], step: 0 };

    const inner = Math.min(Math.max(paddingInner, 0), 1);
    const outer = Math.max(paddingOuter, 0);
    const step = span / Math.max(itemCount - inner + outer * 2, 1);
    const bandwidth = step * (1 - inner);
    const positions = Array.from({ length: itemCount }, (_, index) => start + step * (outer + index));

    return { bandwidth, positions, step };
}

export function createPointScale({
    count,
    end,
    inset = 0,
    start,
}: {
    count: number;
    end: number;
    inset?: number;
    start: number;
}): { positions: number[]; step: number } {
    const itemCount = Math.max(Math.floor(count), 0);
    const safeInset = Math.min(Math.max(inset, 0), Math.max((end - start) / 2, 0));
    const innerStart = start + safeInset;
    const innerEnd = end - safeInset;

    if (!itemCount) return { positions: [], step: 0 };
    if (itemCount === 1) return { positions: [(innerStart + innerEnd) / 2], step: 0 };

    const step = (innerEnd - innerStart) / (itemCount - 1);
    return {
        positions: Array.from({ length: itemCount }, (_, index) => innerStart + step * index),
        step,
    };
}

export interface PlotBox {
    bottom: number;
    left: number;
    right: number;
    top: number;
    height: number;
    width: number;
}

export interface CartesianLayout {
    domain: [number, number];
    mapY: (value: unknown) => number;
    plot: PlotBox;
    xPositions: number[];
    xStep: number;
    yTicks: Array<{ value: number; y: number }>;
}

export function createCartesianLayout({
    categoryCount,
    height,
    includeZero = false,
    padding = {},
    values = [],
    width,
    xInset,
    yDomain,
    yStepSize,
    yTickCount = DEFAULT_TICK_COUNT,
    yTicks,
}: {
    categoryCount: number;
    height: number;
    includeZero?: boolean;
    padding?: { bottom?: number; left?: number; right?: number; top?: number };
    values?: Array<number | undefined>;
    width: number;
    xInset?: number;
    yDomain?: number[];
    yStepSize?: StepSize;
    yTickCount?: number;
    yTicks?: number[];
}): CartesianLayout {
    const safeWidth = Math.max(finiteNumber(width, 0) as number, 1);
    const safeHeight = Math.max(finiteNumber(height, 0) as number, 1);
    const plot = {
        bottom: Math.max(safeHeight - (finiteNumber(padding.bottom, 48) as number), 1),
        left: Math.min(finiteNumber(padding.left, 52) as number, safeWidth - 1),
        right: Math.max(safeWidth - (finiteNumber(padding.right, 20) as number), 1),
        top: Math.min(finiteNumber(padding.top, 24) as number, safeHeight - 1),
    } as PlotBox;

    if (plot.right <= plot.left) plot.right = plot.left + 1;
    if (plot.bottom <= plot.top) plot.bottom = plot.top + 1;

    plot.height = plot.bottom - plot.top;
    plot.width = plot.right - plot.left;

    const tickCount = Math.max(Math.floor(finiteNumber(yTickCount, DEFAULT_TICK_COUNT) as number), 2);
    const initialDomainDetails = createDomainDetails(values, yDomain, includeZero);
    const requestedTicks = Array.isArray(yTicks)
        ? yTicks.map(value => finiteNumber(value)).filter((value): value is number => value !== undefined)
        : [];
    const requestedStep = requestedTicks.length
        ? undefined
        : resolveStepSize(yStepSize, {
              max: initialDomainDetails.domain[1],
              min: initialDomainDetails.domain[0],
              tickCount,
              values: [...initialDomainDetails.values],
          });
    const step = requestedStep ?? niceStep(paddedDomainSpan(initialDomainDetails.domain), tickCount);
    const normalizedDomain = normalizeDomain(initialDomainDetails, step);
    const [domainMinimum, domainMaximum] = normalizedDomain.domain;
    const domainSpan = domainMaximum - domainMinimum || 1;
    const mapY = (value: unknown) =>
        plot.bottom -
        (((finiteNumber(value, domainMinimum) as number) - domainMinimum) / domainSpan) * plot.height;
    const pointScale = createPointScale({
        count: categoryCount,
        end: plot.right,
        inset: finiteNumber(xInset, Math.min(56, plot.width * 0.05)) as number,
        start: plot.left,
    });

    return {
        domain: normalizedDomain.domain,
        mapY,
        plot,
        xPositions: pointScale.positions,
        xStep: pointScale.step,
        yTicks: createTicks(normalizedDomain, requestedTicks, tickCount, requestedStep !== undefined).map(
            value => ({ value, y: mapY(value) }),
        ),
    };
}
