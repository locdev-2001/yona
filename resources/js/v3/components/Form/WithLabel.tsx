import type { ReactNode } from 'react';

// Port từ v3/components/Form/WithLabel.vue (slot icon fluent bỏ — chưa màn nào dùng)
interface WithLabelProps {
    label?: string;
    name: string;
    hasError?: boolean;
    helpMessage?: string;
    errorMessage?: string;
    rightOfLabel?: ReactNode;
    children: ReactNode;
}

export default function WithLabel({
    label = '',
    name,
    hasError = false,
    helpMessage = '',
    errorMessage = '',
    rightOfLabel,
    children,
}: WithLabelProps) {
    return (
        <div className="space-y-1">
            {label ? (
                <label
                    htmlFor={name}
                    className={`flex justify-between text-sm font-medium leading-6 text-n-slate-12 ${hasError ? 'text-n-ruby-12' : ''}`}
                >
                    {label}
                    {rightOfLabel}
                </label>
            ) : null}
            <div className="w-full">
                <div className="flex items-center relative w-full">{children}</div>
                {errorMessage && hasError ? (
                    <div className="text-sm mt-1.5 ml-px text-n-ruby-9 leading-tight">{errorMessage}</div>
                ) : helpMessage ? (
                    <div className="text-sm mt-1.5 ml-px text-n-slate-10 leading-tight">{helpMessage}</div>
                ) : null}
            </div>
        </div>
    );
}
