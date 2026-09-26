import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ sidebar/SidebarGroupHeader.vue
interface SidebarGroupHeaderProps {
    to?: string;
    label: string;
    icon?: string | ReactNode;
    expandable?: boolean;
    isExpanded?: boolean;
    isActive?: boolean;
    hasActiveChild?: boolean;
    count?: number;
    showBadge?: boolean;
    onToggle: () => void;
}

export default function SidebarGroupHeader({
    to = '',
    label,
    icon = '',
    expandable = false,
    isExpanded = false,
    isActive = false,
    hasActiveChild = false,
    count = 0,
    showBadge = false,
    onToggle,
}: SidebarGroupHeaderProps) {
    const classes = [
        'flex items-center gap-2 px-1.5 py-1 rounded-lg h-8 min-w-0 cursor-pointer',
        isActive && !hasActiveChild ? 'text-n-slate-12 bg-n-alpha-2 font-medium' : '',
        hasActiveChild ? 'text-n-slate-12 font-medium' : '',
        !isActive && !hasActiveChild ? 'text-n-slate-11 hover:bg-n-alpha-2' : '',
    ]
        .filter(Boolean)
        .join(' ');

    const content = (
        <>
            {icon ? (
                <div className="relative flex items-center gap-2">
                    <Icon icon={icon} className="size-4" />
                    {showBadge ? (
                        <span className="size-2 -top-px ltr:-right-px rtl:-left-px bg-n-brand absolute rounded-full border border-n-solid-2" />
                    ) : null}
                </div>
            ) : null}
            <div className="flex items-center gap-1.5 flex-grow justify-between min-w-0 flex-1">
                <span className={!isActive ? 'text-body-main truncate' : 'font-medium text-sm truncate'}>{label}</span>
                {count && !expandable ? (
                    <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-n-slate-4 px-1 text-xxs font-medium leading-3 text-n-slate-12 flex-shrink-0">
                        {count > 99 ? '99+' : count}
                    </span>
                ) : null}
            </div>
            {expandable && isExpanded ? (
                <span
                    className="i-lucide-chevron-up size-3"
                    onClick={event => {
                        event.stopPropagation();
                        onToggle();
                    }}
                />
            ) : null}
        </>
    );

    return to ? (
        <Link
            href={to}
            className={classes}
            role="button"
            draggable={false}
            title={label}
            onClick={event => {
                event.stopPropagation();
                onToggle();
            }}
        >
            {content}
        </Link>
    ) : (
        <div
            className={classes}
            role="button"
            draggable={false}
            title={label}
            onClick={event => {
                event.stopPropagation();
                onToggle();
            }}
        >
            {content}
        </div>
    );
}
