import type { ReactNode } from 'react';

import { cn } from './cn';
import { Icon } from './Icon';

export function EmptyState({
    icon = 'i-lucide-inbox',
    title,
    description,
    action,
    className,
}: {
    icon?: string;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
            <div className="flex size-11 items-center justify-center rounded-full bg-console-accent text-console-muted-foreground">
                <Icon name={icon} className="size-5" />
            </div>
            <div className="flex max-w-sm flex-col gap-1">
                <p className="text-sm font-medium text-console-foreground">{title}</p>
                {description ? <p className="text-sm text-console-muted-foreground">{description}</p> : null}
            </div>
            {action}
        </div>
    );
}
