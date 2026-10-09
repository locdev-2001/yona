import type { ButtonHTMLAttributes, ReactNode } from 'react';

import Loader from 'shared/components/loader/Loader';
import Icon from 'dashboard/components-next/icon/Icon';
import type {
    ButtonColor,
    ButtonJustify,
    ButtonSize,
    ButtonVariant,
} from './constants';

// Port từ dashboard/components-next/button/Button.vue. Giao diện không viền: biến thể
// outline và slate solid là nền ô (bg-n-surface-field) thay cho đường viền; tiêu điểm
// bàn phím là vòng brand chung cho mọi biến thể.
// Shorthand boolean (solid/outline/…, blue/ruby/…, xs/sm/md/lg) giữ lại để
// call-site đọc gọn như template.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string | number;
    variant?: ButtonVariant;
    color?: ButtonColor;
    size?: ButtonSize;
    justify?: ButtonJustify;
    icon?: string | ReactNode;
    trailingIcon?: boolean;
    isLoading?: boolean;
    noAnimation?: boolean;
    solid?: boolean;
    outline?: boolean;
    faded?: boolean;
    link?: boolean;
    ghost?: boolean;
    blue?: boolean;
    ruby?: boolean;
    amber?: boolean;
    slate?: boolean;
    teal?: boolean;
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    start?: boolean;
    center?: boolean;
    end?: boolean;
}

const STYLE_CONFIG = {
    colors: {
        blue: {
            solid: 'bg-n-brand text-white hover:enabled:brightness-110 focus-visible:brightness-110 outline-transparent',
            faded: 'bg-n-brand/10 text-n-blue-11 hover:enabled:bg-n-brand/20 focus-visible:bg-n-brand/20 outline-transparent',
            outline: 'bg-n-surface-field text-n-blue-11 hover:enabled:bg-n-surface-field-hover focus-visible:bg-n-surface-field-hover outline-transparent',
            ghost: 'text-n-blue-11 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent',
            link: 'text-n-blue-11 hover:enabled:underline focus-visible:underline outline-transparent',
        },
        ruby: {
            solid: 'bg-n-ruby-9 text-white hover:enabled:bg-n-ruby-10 focus-visible:bg-n-ruby-10 outline-transparent',
            faded: 'bg-n-ruby-9/10 text-n-ruby-11 hover:enabled:bg-n-ruby-9/20 focus-visible:bg-n-ruby-9/20 outline-transparent',
            outline: 'bg-n-surface-field text-n-ruby-11 hover:enabled:bg-n-ruby-9/10 focus-visible:bg-n-ruby-9/10 outline-transparent',
            ghost: 'text-n-ruby-11 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent',
            link: 'text-n-ruby-9 hover:enabled:underline focus-visible:underline outline-transparent',
        },
        amber: {
            solid: 'bg-n-amber-9 text-n-amber-12 hover:enabled:bg-n-amber-10 focus-visible:bg-n-amber-10 outline-transparent',
            faded: 'bg-n-amber-9/10 text-n-slate-12 hover:enabled:bg-n-amber-9/20 focus-visible:bg-n-amber-9/20 outline-transparent',
            outline: 'bg-n-surface-field text-n-amber-11 hover:enabled:bg-n-amber-9/10 focus-visible:bg-n-amber-9/10 outline-transparent',
            link: 'text-n-amber-9 hover:enabled:underline focus-visible:underline outline-transparent',
            ghost: 'text-n-amber-9 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent',
        },
        slate: {
            solid: 'bg-n-surface-field hover:enabled:bg-n-surface-field-hover focus-visible:bg-n-surface-field-hover text-n-slate-12 outline-transparent',
            faded: 'bg-n-slate-9/10 text-n-slate-12 hover:enabled:bg-n-slate-9/20 focus-visible:bg-n-slate-9/20 outline-transparent',
            outline: 'bg-n-surface-field text-n-slate-11 hover:enabled:bg-n-surface-field-hover focus-visible:bg-n-surface-field-hover outline-transparent',
            link: 'text-n-slate-11 hover:enabled:text-n-slate-12 focus-visible:text-n-slate-12 hover:enabled:underline focus-visible:underline outline-transparent',
            ghost: 'text-n-slate-12 hover:enabled:bg-n-surface-hover focus-visible:bg-n-surface-hover outline-transparent',
        },
        teal: {
            solid: 'bg-n-teal-9 text-white hover:enabled:bg-n-teal-10 focus-visible:bg-n-teal-10 outline-transparent',
            faded: 'bg-n-teal-9/10 text-n-teal-11 hover:enabled:bg-n-teal-9/20 focus-visible:bg-n-teal-9/20 outline-transparent',
            outline: 'bg-n-surface-field text-n-teal-11 hover:enabled:bg-n-teal-9/10 focus-visible:bg-n-teal-9/10 outline-transparent',
            link: 'text-n-teal-9 hover:enabled:underline focus-visible:underline outline-transparent',
            ghost: 'text-n-teal-9 hover:enabled:bg-n-alpha-2 focus-visible:bg-n-alpha-2 outline-transparent',
        },
    },
    sizes: {
        regular: {
            xs: 'h-6 px-2',
            sm: 'h-8 px-3',
            md: 'h-10 px-4',
            lg: 'h-12 px-5',
        },
        iconOnly: {
            xs: 'h-6 w-6 p-0',
            sm: 'h-8 w-8 p-0',
            md: 'h-10 w-10 p-0',
            lg: 'h-12 w-12 p-0',
        },
        link: {
            xs: 'p-0',
            sm: 'p-0',
            md: 'p-0',
            lg: 'p-0',
        },
    },
    fontSize: {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-sm font-medium',
        lg: 'text-base',
    },
    clickAnimation: {
        xs: 'active:enabled:scale-[0.97]',
        sm: 'active:enabled:scale-[0.97]',
        md: 'active:enabled:scale-[0.98]',
        lg: 'active:enabled:scale-[0.98]',
    },
    justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
    },
    base: 'inline-flex items-center min-w-0 gap-2 transition-all duration-100 ease-out border-0 rounded-lg outline-1 outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-n-brand disabled:opacity-50',
};

export default function Button({
    label = '',
    variant,
    color,
    size,
    justify,
    icon = '',
    trailingIcon = false,
    isLoading = false,
    noAnimation = false,
    solid,
    outline,
    faded,
    link,
    ghost,
    blue,
    ruby,
    amber,
    slate,
    teal,
    xs,
    sm,
    md,
    lg,
    start,
    center,
    end,
    className,
    children,
    ...attrs
}: ButtonProps) {
    const computedVariant: ButtonVariant =
        variant ??
        (solid ? 'solid' : outline ? 'outline' : faded ? 'faded' : link ? 'link' : ghost ? 'ghost' : 'solid');
    const computedColor: ButtonColor =
        color ?? (blue ? 'blue' : ruby ? 'ruby' : amber ? 'amber' : slate ? 'slate' : teal ? 'teal' : 'blue');
    const computedSize: ButtonSize = size ?? (xs ? 'xs' : sm ? 'sm' : md ? 'md' : lg ? 'lg' : 'md');
    const computedJustify: ButtonJustify = justify ?? (start ? 'start' : center ? 'center' : end ? 'end' : 'center');

    const isIconOnly = !label && !children;
    const isLink = computedVariant === 'link';

    const variantClasses =
        computedVariant === 'link'
            ? `${STYLE_CONFIG.colors[computedColor].link} p-0 font-medium underline-offset-2`
            : STYLE_CONFIG.colors[computedColor][computedVariant];

    const sizeClasses = isLink
        ? STYLE_CONFIG.sizes.link[computedSize]
        : STYLE_CONFIG.sizes[isIconOnly ? 'iconOnly' : 'regular'][computedSize];

    const classes = [
        STYLE_CONFIG.base,
        variantClasses,
        sizeClasses,
        STYLE_CONFIG.fontSize[computedSize],
        noAnimation ? '' : STYLE_CONFIG.clickAnimation[computedSize],
        STYLE_CONFIG.justify[computedJustify],
        trailingIcon && !isIconOnly ? 'flex-row-reverse' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button className={classes} {...attrs}>
            {icon && !isLoading ? <Icon icon={icon} className="flex-shrink-0" /> : null}
            {isLoading ? <Loader size={20} /> : null}
            {children ?? (label !== '' ? <span className="min-w-0 truncate">{label}</span> : null)}
        </button>
    );
}
