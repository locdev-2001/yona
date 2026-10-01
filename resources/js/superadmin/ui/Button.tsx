import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from './cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';

const BASE_CLASS =
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent text-sm font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-console-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    default: 'bg-console-primary text-console-primary-foreground hover:bg-console-primary/85',
    secondary: 'bg-console-accent text-console-accent-foreground hover:bg-console-accent/70',
    outline:
        'border-console-border bg-console-card text-console-foreground shadow-sm hover:bg-console-accent',
    ghost: 'text-console-foreground hover:bg-console-accent',
    destructive:
        'bg-console-destructive/10 text-console-destructive-foreground hover:bg-console-destructive/20',
    link: 'text-console-brand underline-offset-4 hover:underline',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
    default: 'h-9 px-3',
    sm: 'h-8 px-2.5 text-xs',
    lg: 'h-10 px-4',
    icon: 'size-9',
    'icon-sm': 'size-8',
};

// Dùng chung cho <a>/<Link> cần trông như nút.
export function buttonClassName({
    variant = 'default',
    size = 'default',
    className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
    return cn(BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, className, type = 'button', ...props },
    ref,
) {
    return <button ref={ref} type={type} className={buttonClassName({ variant, size, className })} {...props} />;
});
