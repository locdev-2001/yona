import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ sidebar/SidebarGroupSeparator.vue (SidebarSortMenu chưa port —
// sort preferences vào cùng đợt với ui_settings server-side)
const TREE_VERTICAL_LINE =
    "before:content-[''] before:absolute before:-top-1 before:w-0.5 before:bg-n-slate-4 before:start-[-0.5rem]";
const TREE_ELBOW =
    "after:content-[''] after:absolute after:w-2.5 after:h-3 after:bottom-1/2 after:start-[-0.5rem] after:border-b-2 after:border-s-2 after:rounded-es after:border-n-slate-4";

interface SidebarGroupSeparatorProps {
    collapsible?: boolean;
    isExpanded?: boolean;
    label?: string;
    icon?: string | ReactNode;
    showTreeLine?: boolean;
    endTreeLine?: boolean;
    className?: string;
    onToggle: () => void;
}

export default function SidebarGroupSeparator({
    collapsible = false,
    isExpanded = true,
    label = '',
    icon = '',
    showTreeLine = false,
    endTreeLine = false,
    className = '',
    onToggle,
}: SidebarGroupSeparatorProps) {
    const sharedClasses = [
        'relative flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-n-slate-10 select-none',
        showTreeLine ? TREE_VERTICAL_LINE : '',
        showTreeLine ? (endTreeLine ? `before:h-3 ${TREE_ELBOW}` : 'before:-bottom-1') : '',
        collapsible ? 'cursor-pointer hover:bg-n-alpha-2 pe-8' : 'pointer-events-none',
    ]
        .filter(Boolean)
        .join(' ');

    const content = (
        <div className="inline-flex min-w-0 items-center gap-2">
            {icon ? <Icon icon={icon} className="size-4 flex-shrink-0" /> : null}
            <span className="flex-grow truncate text-start text-sm font-medium leading-5">{label}</span>
        </div>
    );

    return (
        <div className={`relative min-w-0 my-1 ${collapsible ? 'ms-5' : ''} ${className}`}>
            {collapsible ? (
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    title={label}
                    className={sharedClasses}
                    onClick={event => {
                        event.stopPropagation();
                        onToggle();
                    }}
                >
                    {content}
                </button>
            ) : (
                <div title={label} className={sharedClasses}>
                    {content}
                </div>
            )}
            {collapsible ? (
                <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <button
                        type="button"
                        className="flex size-6 flex-shrink-0 items-center justify-center rounded-md text-n-slate-10 hover:bg-n-alpha-2 focus-visible:bg-n-alpha-2 focus-visible:outline-none"
                        aria-expanded={isExpanded}
                        aria-label={label}
                        onClick={event => {
                            event.stopPropagation();
                            onToggle();
                        }}
                    >
                        <span
                            className={`size-3 flex-shrink-0 ${isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'}`}
                        />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
