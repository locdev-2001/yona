import { useId, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';

import { t } from '../../i18n';
import { cn } from '../ui/cn';
import { formatDay, formatNumber } from './format';

export type Series = { key: string; label: string; colorClass: string; values: number[] };

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 200;
const GRID_STEPS = 4;

function niceMax(value: number): number {
    if (value <= GRID_STEPS) return GRID_STEPS;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].map(factor => factor * magnitude).find(candidate => candidate * GRID_STEPS >= value);

    return (step ?? magnitude * 10) * GRID_STEPS;
}

export function seriesSummary(series: Series, dates: string[]): string {
    const total = series.values.reduce((sum, value) => sum + value, 0);
    const max = Math.max(0, ...series.values);
    const peakIndex = series.values.indexOf(max);

    return t('ADMIN_DASHBOARD.CHART.SUMMARY', {
        label: series.label,
        total: formatNumber(total),
        max: formatNumber(max),
        date: peakIndex >= 0 && dates[peakIndex] ? formatDay(dates[peakIndex]) : '—',
    });
}

function Legend({ series }: { series: Series[] }) {
    if (series.length < 2) return null;

    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-console-muted-foreground">
            {series.map(item => (
                <li key={item.key} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn('inline-block size-2.5 rounded-sm bg-current', item.colorClass)} />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

function DataTable({ dates, series, caption }: { dates: string[]; series: Series[]; caption: string }) {
    return (
        <table className="sr-only">
            <caption>{caption}</caption>
            <thead>
                <tr>
                    <th scope="col">{t('ADMIN_DASHBOARD.CHART.DATE')}</th>
                    {series.map(item => (
                        <th scope="col" key={item.key}>
                            {item.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {dates.map((date, index) => (
                    <tr key={date}>
                        <th scope="row">{formatDay(date)}</th>
                        {series.map(item => (
                            <td key={item.key}>{item.values[index] ?? 0}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// Biểu đồ theo ngày (đường hoặc cột). SVG co giãn theo bề ngang, chữ trục vẽ
// bằng HTML để không méo; trình đọc màn hình đọc câu tóm tắt + bảng ẩn.
export function TimeSeriesChart({
    dates,
    series,
    variant = 'line',
    title,
    height = 180,
}: {
    dates: string[];
    series: Series[];
    variant?: 'line' | 'bar';
    title: string;
    height?: number;
}) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const descriptionId = useId();
    const count = dates.length;
    const max = niceMax(Math.max(0, ...series.flatMap(item => item.values)));
    const step = count > 1 ? VIEW_WIDTH / (count - 1) : VIEW_WIDTH;
    const slot = VIEW_WIDTH / Math.max(count, 1);

    const xAt = (index: number) => (variant === 'bar' ? slot * index + slot / 2 : count > 1 ? step * index : VIEW_WIDTH / 2);
    const yAt = (value: number) => VIEW_HEIGHT - (value / max) * VIEW_HEIGHT;

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - box.left) / Math.max(box.width, 1), 0), 1);
        const index = variant === 'bar' ? Math.floor(ratio * count) : Math.round(ratio * (count - 1));
        setHoverIndex(Math.min(Math.max(index, 0), count - 1));
    };

    const labelEvery = Math.max(1, Math.ceil(count / 6));
    const barWidth = (slot * 0.7) / Math.max(series.length, 1);

    return (
        <figure className="flex flex-col gap-3">
            <Legend series={series} />
            <p id={descriptionId} className="sr-only">
                {series.map(item => seriesSummary(item, dates)).join(' ')}
            </p>
            <div className="flex gap-2">
                <div
                    aria-hidden="true"
                    className="flex flex-col justify-between text-right text-[11px] tabular-nums text-console-muted-foreground"
                    style={{ height }}
                >
                    {Array.from({ length: GRID_STEPS + 1 }, (_, index) => (
                        <span key={index} className="-my-1.5 leading-3">
                            {formatNumber((max / GRID_STEPS) * (GRID_STEPS - index))}
                        </span>
                    ))}
                </div>
                <div
                    className="relative min-w-0 flex-1"
                    style={{ height }}
                    onPointerMove={count > 0 ? onPointerMove : undefined}
                    onPointerLeave={() => setHoverIndex(null)}
                >
                    <svg
                        role="img"
                        aria-label={title}
                        aria-describedby={descriptionId}
                        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                        preserveAspectRatio="none"
                        className="size-full overflow-visible"
                    >
                        {Array.from({ length: GRID_STEPS + 1 }, (_, index) => (
                            <line
                                key={index}
                                x1={0}
                                x2={VIEW_WIDTH}
                                y1={(VIEW_HEIGHT / GRID_STEPS) * index}
                                y2={(VIEW_HEIGHT / GRID_STEPS) * index}
                                className="stroke-console-border"
                                strokeDasharray={index === GRID_STEPS ? undefined : '3 3'}
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                        {hoverIndex !== null ? (
                            <line
                                x1={xAt(hoverIndex)}
                                x2={xAt(hoverIndex)}
                                y1={0}
                                y2={VIEW_HEIGHT}
                                className="stroke-console-muted-foreground/40"
                                vectorEffect="non-scaling-stroke"
                            />
                        ) : null}
                        {series.map((item, seriesIndex) =>
                            variant === 'bar' ? (
                                <g key={item.key} className={cn('fill-current', item.colorClass)}>
                                    {item.values.map((value, index) => (
                                        <rect
                                            key={index}
                                            x={slot * index + slot * 0.15 + barWidth * seriesIndex}
                                            y={yAt(value)}
                                            width={barWidth}
                                            height={VIEW_HEIGHT - yAt(value)}
                                            opacity={hoverIndex === null || hoverIndex === index ? 1 : 0.55}
                                        />
                                    ))}
                                </g>
                            ) : (
                                <polyline
                                    key={item.key}
                                    points={item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ')}
                                    fill="none"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    className={cn('stroke-current', item.colorClass)}
                                    vectorEffect="non-scaling-stroke"
                                />
                            ),
                        )}
                    </svg>
                    {hoverIndex !== null && dates[hoverIndex] ? (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute top-0 z-10 min-w-28 -translate-x-1/2 rounded-md border border-console-border bg-console-card px-2.5 py-1.5 text-xs shadow-md"
                            style={{ left: `${Math.min(Math.max((xAt(hoverIndex) / VIEW_WIDTH) * 100, 12), 88)}%` }}
                        >
                            <p className="font-medium">{formatDay(dates[hoverIndex])}</p>
                            {series.map(item => (
                                <p key={item.key} className="flex items-center justify-between gap-3 tabular-nums">
                                    <span className="flex items-center gap-1.5 text-console-muted-foreground">
                                        <span className={cn('inline-block size-2 rounded-sm bg-current', item.colorClass)} />
                                        {item.label}
                                    </span>
                                    {formatNumber(item.values[hoverIndex] ?? 0)}
                                </p>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
            <div aria-hidden="true" className="ml-8 flex justify-between text-[11px] tabular-nums text-console-muted-foreground">
                {dates
                    .filter((_, index) => index % labelEvery === 0 || index === count - 1)
                    .slice(-7)
                    .map(date => (
                        <span key={date}>{formatDay(date)}</span>
                    ))}
            </div>
            <DataTable dates={dates} series={series} caption={title} />
        </figure>
    );
}

// Thanh ngang: dùng cho phân bổ theo hạng mục (kênh, account).
export function HorizontalBars({
    items,
    colorClass = 'text-console-brand',
}: {
    items: { key: string; label: ReactNode; value: number; valueLabel?: string; href?: string }[];
    colorClass?: string;
}) {
    const max = Math.max(1, ...items.map(item => item.value));

    return (
        <ul className="flex flex-col gap-2.5">
            {items.map(item => (
                <li key={item.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                            {item.href ? (
                                <a href={item.href} className="hover:underline">
                                    {item.label}
                                </a>
                            ) : (
                                item.label
                            )}
                        </span>
                        <span className="shrink-0 tabular-nums text-console-muted-foreground">
                            {item.valueLabel ?? formatNumber(item.value)}
                        </span>
                    </div>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-console-accent">
                        <div
                            className={cn('h-full rounded-full bg-current', colorClass)}
                            style={{ width: `${(item.value / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
