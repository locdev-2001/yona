import type { HTMLAttributes } from 'react';

import { cn } from './cn';

type DivProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-5 rounded-xl border border-console-border bg-console-card py-5 text-sm text-console-foreground shadow-sm',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: DivProps) {
    return <div className={cn('flex items-start justify-between gap-3 px-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-base font-semibold leading-snug', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('mt-1 text-sm text-console-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
    return <div className={cn('px-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
    return <div className={cn('flex items-center gap-2 px-5', className)} {...props} />;
}
