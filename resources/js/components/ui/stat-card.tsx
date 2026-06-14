import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

interface StatCardProps {
    label: string;
    value: string;
    icon?: LucideIcon;
    delta?: number;
    deltaLabel?: string;
    series?: number[];
}

function Sparkline({ values }: { values: number[] }) {
    const gradientId = `stat-spark-${useId().replace(/:/g, '')}`;
    const width = 120;
    const height = 36;
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    const step = width / (values.length - 1);
    const points = values.map((value, index) => [index * step, height - ((value - min) / span) * height] as const);
    const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

/**
 * KPI stat card (design-system §8): muted label + icon, big tabular-nums value,
 * semantic delta pill, optional inline data-viz sparkline (violet --chart-1).
 * Shared by the tenant and admin dashboards so the metric look is defined once.
 */
export function StatCard({ label, value, icon: Icon, delta, deltaLabel, series }: StatCardProps) {
    const up = (delta ?? 0) >= 0;
    const Trend = up ? TrendingUp : TrendingDown;

    return (
        <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm font-medium">{label}</span>
                {Icon && <Icon className="text-muted-foreground size-4" aria-hidden />}
            </div>
            <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
                {delta != null && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                            up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10',
                        )}
                    >
                        <Trend className="size-3.5" aria-hidden />
                        {up ? '+' : ''}
                        {delta}%
                    </span>
                )}
            </div>
            {series && series.length > 1 && <Sparkline values={series} />}
            {deltaLabel && <span className="text-muted-foreground text-xs">{deltaLabel}</span>}
        </Card>
    );
}
