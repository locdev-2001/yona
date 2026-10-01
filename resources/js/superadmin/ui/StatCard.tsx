import type { ReactNode } from 'react';

import { Card } from './Card';
import { cn } from './cn';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

const numberFormatter = new Intl.NumberFormat('vi-VN');
const percentFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

function deltaTone(delta: number): string {
    if (delta > 0) return 'text-console-success-foreground';
    if (delta < 0) return 'text-console-destructive-foreground';

    return 'text-console-muted-foreground';
}

// Thẻ số liệu: số lớn + nhãn + chênh lệch % so với kỳ trước (`delta` tính theo %,
// null = không có kỳ so sánh).
export function StatCard({
    label,
    value,
    delta = null,
    deltaLabel,
    icon,
    loading = false,
    footer,
    className,
}: {
    label: ReactNode;
    value: number | string | null;
    delta?: number | null;
    deltaLabel?: ReactNode;
    icon?: string;
    loading?: boolean;
    footer?: ReactNode;
    className?: string;
}) {
    const displayValue = typeof value === 'number' ? numberFormatter.format(value) : (value ?? '—');

    return (
        <Card className={cn('gap-3 px-5', className)}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-console-muted-foreground">{label}</p>
                {icon ? (
                    <span className="flex size-8 items-center justify-center rounded-md bg-console-accent text-console-muted-foreground">
                        <Icon name={icon} />
                    </span>
                ) : null}
            </div>
            {loading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{displayValue}</p>
            )}
            {!loading && delta !== null ? (
                <p className="flex items-center gap-1 text-xs">
                    <span className={cn('inline-flex items-center gap-0.5 font-medium', deltaTone(delta))}>
                        {delta > 0 ? <Icon name="i-lucide-trending-up" className="size-3.5" /> : null}
                        {delta < 0 ? <Icon name="i-lucide-trending-down" className="size-3.5" /> : null}
                        {percentFormatter.format(delta)}%
                    </span>
                    {deltaLabel ? <span className="text-console-muted-foreground">{deltaLabel}</span> : null}
                </p>
            ) : null}
            {footer}
        </Card>
    );
}
