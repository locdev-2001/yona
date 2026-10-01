import type { ReactNode } from 'react';

import { cn } from './cn';
import { Icon } from './Icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'destructive';

const TONE_CLASS: Record<AlertTone, string> = {
    info: 'border-console-border bg-console-card text-console-foreground',
    success: 'border-console-success/30 bg-console-success/10 text-console-success-foreground',
    warning: 'border-console-warning/40 bg-console-warning/10 text-console-warning-foreground',
    destructive: 'border-console-destructive/30 bg-console-destructive/10 text-console-destructive-foreground',
};

const TONE_ICON: Record<AlertTone, string> = {
    info: 'i-lucide-info',
    success: 'i-lucide-circle-check',
    warning: 'i-lucide-triangle-alert',
    destructive: 'i-lucide-circle-alert',
};

export function Alert({
    tone = 'info',
    title,
    children,
    action,
    className,
}: {
    tone?: AlertTone;
    title?: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role={tone === 'destructive' ? 'alert' : 'status'}
            className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', TONE_CLASS[tone], className)}
        >
            <Icon name={TONE_ICON[tone]} className="mt-0.5" />
            <div className="min-w-0 flex-1">
                {title ? <p className="font-medium">{title}</p> : null}
                {children ? <div className={cn(title ? 'mt-1' : '', 'break-words')}>{children}</div> : null}
            </div>
            {action}
        </div>
    );
}
