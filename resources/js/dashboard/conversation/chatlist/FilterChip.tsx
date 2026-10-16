import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Chip lọc dùng chung cho bảng Lọc và hàng chip đang bật: bo 4px, chạm 44px dưới 768px.
interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isSelected?: boolean;
    children: ReactNode;
}

export default function FilterChip({ isSelected = false, className = '', children, ...buttonProps }: FilterChipProps) {
    return (
        <button
            type="button"
            className={[
                'inline-flex items-center gap-1.5 h-11 md:h-7 max-w-full px-2.5 rounded text-sm md:text-xs whitespace-nowrap',
                'outline outline-1 -outline-offset-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-n-brand',
                isSelected
                    ? 'bg-n-blue-3 text-n-blue-11 outline-n-blue-7'
                    : 'bg-n-surface-field text-n-slate-11 outline-n-weak hover:bg-n-surface-hover hover:text-n-slate-12',
                className,
            ].join(' ')}
            {...buttonProps}
        >
            {children}
        </button>
    );
}
