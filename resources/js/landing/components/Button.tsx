import type { AnchorHTMLAttributes } from 'react';

// Nút của trang chủ. Nhánh `main` dùng shadcn (class-variance-authority +
// @radix-ui/react-slot); nhánh này không có hai gói đó và trang chủ chỉ cần ba
// biến thể, nên giữ bảng biến thể tường minh thay vì kéo thêm phụ thuộc.
type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'default' | 'lg';

const BASE =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
};

const SIZES: Record<Size, string> = {
    default: 'h-9 px-4 py-2',
    lg: 'h-11 rounded-md px-8 text-base',
};

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    variant?: Variant;
    size?: Size;
}

export function ButtonLink({ variant = 'primary', size = 'default', className = '', ...props }: ButtonLinkProps) {
    return <a {...props} className={[BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ')} />;
}
