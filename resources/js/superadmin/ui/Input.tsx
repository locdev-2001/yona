import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from './cn';

const CONTROL_CLASS =
    'w-full min-w-0 rounded-md border border-console-input bg-console-card px-3 text-sm text-console-foreground shadow-sm outline-none transition-colors placeholder:text-console-muted-foreground focus-visible:border-console-ring focus-visible:ring-2 focus-visible:ring-console-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-console-destructive';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
    { className, ...props },
    ref,
) {
    return <input ref={ref} className={cn(CONTROL_CLASS, 'h-9', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function Textarea({ className, ...props }, ref) {
        return <textarea ref={ref} className={cn(CONTROL_CLASS, 'min-h-20 py-2', className)} {...props} />;
    },
);

// Select gốc của trình duyệt (không popup tự vẽ): đủ cho console, bàn phím và
// trình đọc màn hình chạy sẵn.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
    { className, children, ...props },
    ref,
) {
    return (
        <div className="relative w-full">
            <select ref={ref} className={cn(CONTROL_CLASS, 'h-9 cursor-pointer appearance-none pr-8', className)} {...props}>
                {children}
            </select>
            <span
                aria-hidden="true"
                className="i-lucide-chevron-down pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-console-muted-foreground"
            />
        </div>
    );
});

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn('text-sm font-medium leading-none text-console-foreground', className)} {...props} />;
}

// Một ô biểu mẫu: nhãn + điều khiển + gợi ý + lỗi, nhãn gắn với điều khiển qua `htmlFor`.
export function Field({
    label,
    htmlFor,
    hint,
    error,
    required = false,
    className,
    children,
}: {
    label: ReactNode;
    htmlFor: string;
    hint?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <Label htmlFor={htmlFor}>
                {label}
                {required ? <span className="ml-0.5 text-console-destructive">*</span> : null}
            </Label>
            {children}
            {hint ? <p className="text-xs text-console-muted-foreground">{hint}</p> : null}
            {error ? (
                <p role="alert" className="text-xs text-console-destructive-foreground">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
