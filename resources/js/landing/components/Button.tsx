import type { AnchorHTMLAttributes } from 'react';

// Công thức theo docs/design-system.md §3.1.
// Chỉ `transform` có transition — màu đổi tức thì để cú nhấn dứt khoát.
const BASE =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-normal ' +
    'transition-transform duration-press ease-out active:scale-[0.97] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:shadow-focus ' +
    'disabled:pointer-events-none';

const VARIANT = {
    primary:
        'bg-primary-600 text-neutral-0 hover:bg-primary-700 active:bg-primary-800 disabled:bg-neutral-200 disabled:text-neutral-400',
    // Viền MỰC, không phải xám nhạt. Đo trên bề mặt tham chiếu: nút phụ dùng
    // viền 1px cùng màu chữ. Thứ bậc đã nằm ở tương phản đặc/rỗng — viền xám
    // nhạt thì nút phụ đọc ra như nút bị vô hiệu chứ không phải lựa chọn hai.
    secondary:
        'border border-neutral-900 text-neutral-900 hover:border-neutral-700 hover:text-neutral-700 active:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-300',
    ghost: 'text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-400',
    // Trên nền navy: đảo vòng focus sang trắng để còn nhìn thấy.
    onDark:
        'bg-neutral-0 text-navy hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-neutral-0 focus-visible:shadow-focus-dark',
    onDarkGhost:
        'border border-neutral-0/30 text-neutral-0 hover:border-neutral-0/60 focus-visible:outline-neutral-0 focus-visible:shadow-focus-dark',
} as const;

// Dưới 768px vùng bấm nới lên 44px cho ngón tay; desktop về đúng thang 40/32.
const SIZE = {
    md: 'h-11 px-3.5 text-base md:h-10',
    sm: 'h-10 px-2.5 text-sm md:h-8',
} as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
    return [BASE, VARIANT[variant], SIZE[size], extra].filter(Boolean).join(' ');
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function ButtonLink({ variant = 'primary', size = 'md', className = '', ...props }: ButtonLinkProps) {
    return <a {...props} className={buttonClass(variant, size, className)} />;
}

/** Hai nút cạnh nhau là nhịp lặp của mọi section — gói lại để không lệch nhau. */
export function CtaPair({
    primary,
    secondary,
    align = 'start',
    dark = false,
}: {
    primary: { label: string; href: string };
    secondary?: { label: string; href: string };
    align?: 'start' | 'center';
    dark?: boolean;
}) {
    return (
        <div className={`flex flex-col gap-3 sm:flex-row ${align === 'center' ? 'items-center justify-center' : 'items-start'}`}>
            <ButtonLink href={primary.href} variant={dark ? 'onDark' : 'primary'}>
                {primary.label}
            </ButtonLink>
            {secondary && (
                <ButtonLink href={secondary.href} variant={dark ? 'onDarkGhost' : 'secondary'}>
                    {secondary.label}
                </ButtonLink>
            )}
        </div>
    );
}

/**
 * Link chữ dưới mỗi thẻ. Không mũi tên: nó lặp lại ba lần một hàng, và ba mũi
 * tên cạnh nhau đọc thành hoa văn chứ không thành ba hành động.
 */
export function TextLink({ href, children }: { href: string; children: string }) {
    return (
        <a
            href={href}
            className="inline-flex min-h-11 items-center rounded text-sm text-neutral-600 underline decoration-neutral-300 underline-offset-4 md:min-h-0 hover:text-neutral-900 hover:decoration-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
            {children}
        </a>
    );
}
