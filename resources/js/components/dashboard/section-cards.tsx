import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';

// Mock KPI data — dashboard-01 SectionCards. Wire to real metrics later.
const cards = [
    { label: 'Total Revenue', value: '$1,250.00', delta: 12.5, up: true, hint: 'Trending up this month', sub: 'Visitors for the last 6 months' },
    { label: 'New Leads', value: '1,234', delta: -20, up: false, hint: 'Down 20% this period', sub: 'Acquisition needs attention' },
    { label: 'Active Deals', value: '45,678', delta: 12.5, up: true, hint: 'Strong pipeline retention', sub: 'Engagement exceeds targets' },
    { label: 'Win Rate', value: '4.5%', delta: 4.5, up: true, hint: 'Steady performance increase', sub: 'Meets growth projections' },
];

export function SectionCards() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => {
                const Trend = c.up ? TrendingUp : TrendingDown;
                return (
                    <Card key={c.label} className="shadow-sm">
                        <CardHeader className="gap-1.5">
                            <span className="text-muted-foreground text-sm">{c.label}</span>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-2xl font-semibold tabular-nums">{c.value}</span>
                                <Badge variant="secondary" className={c.up ? 'text-success' : 'text-destructive'}>
                                    <Trend className="size-3.5" aria-hidden />
                                    {c.delta > 0 ? '+' : ''}
                                    {c.delta}%
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="hidden" />
                        <CardFooter className="flex-col items-start gap-0.5 text-sm">
                            <span className="flex items-center gap-1.5 font-medium">
                                {c.hint}
                                <Trend className="size-4" aria-hidden />
                            </span>
                            <span className="text-muted-foreground">{c.sub}</span>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}
