import type { HTMLAttributes } from 'react';

import { cn } from './cn';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
    default: 'bg-console-primary text-console-primary-foreground',
    secondary: 'bg-console-accent text-console-accent-foreground',
    outline: 'border-console-border text-console-foreground',
    success: 'bg-console-success/10 text-console-success-foreground',
    warning: 'bg-console-warning/15 text-console-warning-foreground',
    destructive: 'bg-console-destructive/10 text-console-destructive-foreground',
};

export function Badge({
    variant = 'secondary',
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
    return (
        <span
            className={cn(
                'inline-flex h-5 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 text-xs font-medium',
                VARIANT_CLASS[variant],
                className,
            )}
            {...props}
        />
    );
}
