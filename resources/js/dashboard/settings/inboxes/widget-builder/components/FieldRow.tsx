import type { ReactNode } from 'react';

interface FieldRowProps {
    label: string;
    hint?: string;
    error?: string;
    htmlFor?: string;
    children: ReactNode;
}

// Hàng nhãn/ô của mỗi thẻ cấu hình — nhãn cột hẹp bên trái, ô nhập co giãn bên
// phải, đúng bố cục "label/field grid" của bản thiết kế.
export default function FieldRow({ label, hint = '', error = '', htmlFor, children }: FieldRowProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1.5 sm:gap-4 items-start">
            <label htmlFor={htmlFor} className="text-body-main font-medium text-n-slate-12 sm:pt-2">
                {label}
            </label>
            <div className="flex flex-col gap-1 min-w-0">
                {children}
                {error ? (
                    <p className="text-label-small text-n-ruby-9">{error}</p>
                ) : hint ? (
                    <p className="text-label-small text-n-slate-11">{hint}</p>
                ) : null}
            </div>
        </div>
    );
}
