import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Nút icon của hàng đầu cột danh sách (Lọc, Chọn nhiều, Soạn tin, ⋯): cùng cỡ với ô tìm,
// bo 4px, chạm 44px dưới 768px.
interface ListHeaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    label: string;
    isActive?: boolean;
    badge?: ReactNode;
}

const ListHeaderButton = forwardRef<HTMLButtonElement, ListHeaderButtonProps>(function ListHeaderButton(
    { icon, label, isActive = false, badge, className = '', ...buttonProps },
    ref,
) {
    return (
        <button
            ref={ref}
            type="button"
            title={label}
            aria-label={label}
            className={[
                'field-surface relative grid place-content-center size-9 max-md:size-11 shrink-0 rounded',
                'transition-colors duration-150 hover:text-n-slate-12 focus-visible:outline-2 focus-visible:outline-n-brand',
                isActive ? 'text-n-blue-11 !bg-n-blue-3' : 'text-n-slate-11',
                className,
            ].join(' ')}
            {...buttonProps}
        >
            <span className={`${icon} size-[1.125rem]`} aria-hidden="true" />
            {badge}
        </button>
    );
});

export default ListHeaderButton;
