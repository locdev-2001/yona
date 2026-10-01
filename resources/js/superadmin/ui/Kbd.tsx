import type { HTMLAttributes } from 'react';

import { cn } from './cn';

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <kbd
            className={cn(
                'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded border border-console-border bg-console-muted px-1 font-sans text-[0.6875rem] font-medium text-console-muted-foreground',
                className,
            )}
            {...props}
        />
    );
}
