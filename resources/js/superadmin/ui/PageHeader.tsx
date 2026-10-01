import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { cn } from './cn';

// Đầu trang: đặt luôn <title> của tab theo `title` (chuỗi), nên trang không cần <Head> riêng.
export function PageHeader({
    title,
    description,
    actions,
    className,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
            <Head title={title} />
            <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-console-foreground">{title}</h1>
                {description ? <p className="mt-1 text-sm text-console-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
