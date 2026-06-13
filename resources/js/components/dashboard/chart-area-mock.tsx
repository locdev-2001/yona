import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useState } from 'react';

// Mock area chart (no chart lib) — dashboard-01 ChartAreaInteractive placeholder.
const W = 600;
const H = 220;

const series: Record<string, number[]> = {
    '90d': [40, 62, 48, 80, 70, 96, 88, 120, 104, 150, 132, 168],
    '30d': [60, 72, 64, 90, 84, 78, 110, 96, 132, 120, 156, 148],
    '7d': [88, 104, 96, 130, 118, 150, 168],
};
const secondary: Record<string, number[]> = {
    '90d': [24, 36, 30, 52, 44, 60, 56, 78, 70, 96, 84, 110],
    '30d': [30, 44, 38, 56, 50, 46, 70, 60, 84, 76, 100, 92],
    '7d': [50, 64, 58, 82, 72, 96, 108],
};

function paths(values: number[]) {
    const max = Math.max(...values) * 1.15;
    const step = W / (values.length - 1);
    const pts = values.map((v, i) => [i * step, H - (v / max) * H] as const);
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    return { line, area };
}

const ranges = [
    { key: '90d', label: 'Last 3 months' },
    { key: '30d', label: 'Last 30 days' },
    { key: '7d', label: 'Last 7 days' },
];

export function ChartAreaMock() {
    const [range, setRange] = useState<keyof typeof series>('90d');
    const a = paths(series[range]);
    const b = paths(secondary[range]);

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="grid gap-1">
                    <CardTitle>Deals closed</CardTitle>
                    <CardDescription>Total for the selected period</CardDescription>
                </div>
                <ToggleGroup
                    type="single"
                    value={range}
                    onValueChange={(v) => v && setRange(v as keyof typeof series)}
                    variant="outline"
                    className="hidden sm:flex"
                >
                    {ranges.map((r) => (
                        <ToggleGroupItem key={r.key} value={r.key} className="px-3 text-xs">
                            {r.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </CardHeader>
            <CardContent>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    className="aspect-[3/1] w-full"
                    role="img"
                    aria-label="Deals closed area chart"
                >
                    <defs>
                        <linearGradient id="fill-1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="fill-2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    <path d={b.area} fill="url(#fill-2)" />
                    <path d={b.line} fill="none" stroke="var(--chart-2)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d={a.area} fill="url(#fill-1)" />
                    <path d={a.line} fill="none" stroke="var(--chart-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="bg-chart-1 size-2 rounded-full" /> Closed
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="bg-chart-2 size-2 rounded-full" /> Forecast
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
