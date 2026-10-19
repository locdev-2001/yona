import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Nút icon đầu cột danh sách. `icon` (mặc định): icon nhỏ không nền trên dòng tiêu đề
// (Lọc, Nhắn tin mới, Chọn nhiều, ⋯). `field`: ô vuông cùng cỡ ô tìm (Soạn tin).
// Dưới 768px: nút icon 32px, nút ô 40px cho cân với ô tìm.
interface ListHeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    label: string;
    isActive?: boolean;
    badge?: ReactNode;
    variant?: 'icon' | 'field';
}

const VARIANT_CLASSES = {
    icon: 'size-6 max-md:size-8 rounded-lg bg-n-slate-9/10 hover:bg-n-slate-9/20 active:scale-[0.97]',
    field: 'field-surface size-9 max-md:size-10 rounded-lg',
} as const;

const ICON_SIZE_CLASSES = {
    icon: 'size-3.5 max-md:size-4',
    field: 'size-[1.125rem]',
} as const;

const ListHeaderButton = forwardRef<HTMLButtonElement, ListHeaderButtonProps>(function ListHeaderButton(
    { icon, label, isActive = false, badge, variant = 'icon', className = '', ...buttonProps },
    ref,
) {
    return (
        <button
            ref={ref}
            type="button"
            title={label}
            aria-label={label}
            className={[
                'relative grid place-content-center shrink-0',
                VARIANT_CLASSES[variant],
                'transition-colors duration-150 hover:text-n-slate-12 focus-visible:outline-2 focus-visible:outline-n-brand',
                isActive ? 'text-n-blue-11 !bg-n-blue-3' : 'text-n-slate-12',
                className,
            ].join(' ')}
            {...buttonProps}
        >
            <span className={`${icon} ${ICON_SIZE_CLASSES[variant]}`} aria-hidden="true" />
            {badge}
        </button>
    );
});

export default ListHeaderButton;
