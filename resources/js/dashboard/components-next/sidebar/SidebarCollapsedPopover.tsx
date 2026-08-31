import { useLayoutEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import SidebarUnreadBadge from './SidebarUnreadBadge';
import { useSidebarContext } from './provider';
import type { SidebarMenuChild } from './provider';

// Port từ sidebar/SidebarCollapsedPopover.vue — flyout khi sidebar thu gọn.
// SidebarSortMenu (cần prefs backend, B8) + transition expand/collapse lược;
// isAllowed permission = child có `to` (menuItems đã lọc EE/permission khi build).
interface SidebarCollapsedPopoverProps {
    label: string;
    children: SidebarMenuChild[];
    activeChild?: SidebarMenuChild;
    triggerRect: { top: number };
    onClose: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const VIEWPORT_MARGIN = 20;

export default function SidebarCollapsedPopover({
    label,
    children,
    activeChild,
    triggerRect,
    onClose,
    onMouseEnter,
    onMouseLeave,
}: SidebarCollapsedPopoverProps) {
    const { sidebarWidth } = useSidebarContext();
    const popoverRef = useRef<HTMLDivElement>(null);
    const [topPosition, setTopPosition] = useState(triggerRect.top);

    const activeParentGroup = activeChild
        ? children.find(child => child.children?.some(subChild => subChild.name === activeChild.name))
        : undefined;
    const [expandedSubGroup, setExpandedSubGroup] = useState<string | null>(activeParentGroup?.name ?? null);

    const toggleSubGroup = (name: string) =>
        setExpandedSubGroup(current => (current === name ? null : name));

    const accessibleChildren = children.filter(child =>
        child.children ? child.children.some(subChild => subChild.to) : Boolean(child.to),
    );

    // Clamp đáy viewport như onMounted của gốc (đo chiều cao thật rồi đặt top).
    useLayoutEffect(() => {
        const viewportHeight = window.innerHeight;
        const popoverHeight = popoverRef.current?.offsetHeight || 300;
        const triggerTop = triggerRect.top;

        setTopPosition(
            triggerTop + popoverHeight > viewportHeight - VIEWPORT_MARGIN
                ? Math.max(VIEWPORT_MARGIN, viewportHeight - popoverHeight - VIEWPORT_MARGIN)
                : triggerTop,
        );
    }, [triggerRect.top, expandedSubGroup]);

    const navigateAndClose = (to: string) => {
        router.visit(to);
        onClose();
    };

    const isActive = (child: SidebarMenuChild) => activeChild?.name === child.name;

    return (
        <div
            ref={popoverRef}
            data-popover-content
            className="fixed z-[100] min-w-[200px] max-w-[280px]"
            style={{ left: sidebarWidth + 8, top: topPosition }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="bg-n-alpha-3 backdrop-blur-[100px] outline outline-1 -outline-offset-1 w-56 outline-n-weak rounded-xl shadow-lg py-2 px-2">
                <div className="px-2 py-1.5 text-xs font-medium text-n-slate-11 uppercase tracking-wider border-b border-n-weak mb-1">
                    {label}
                </div>
                <ul className="m-0 p-0 list-none max-h-[400px] overflow-y-auto no-scrollbar">
                    {accessibleChildren.map(child =>
                        child.children ? (
                            <li key={child.name} className="group/sidebar-section py-0.5">
                                <div className="flex items-center rounded-lg text-n-slate-11 hover:bg-n-alpha-2 transition-colors duration-150 ease-out">
                                    <button
                                        type="button"
                                        className="flex flex-1 min-w-0 items-center gap-2 ps-2 py-1.5 text-left rtl:text-right"
                                        onClick={() => toggleSubGroup(child.name)}
                                    >
                                        {child.icon ? (
                                            <Icon icon={child.icon} className="size-4 flex-shrink-0" />
                                        ) : null}
                                        <span className="flex-1 truncate text-sm">{child.label}</span>
                                    </button>
                                    <div className="flex flex-shrink-0 items-center gap-1 pe-2">
                                        <button
                                            type="button"
                                            className="flex size-6 flex-shrink-0 items-center justify-center rounded-md text-n-slate-11 hover:bg-n-alpha-2 focus-visible:bg-n-alpha-2 focus-visible:outline-none"
                                            onClick={event => {
                                                event.stopPropagation();
                                                toggleSubGroup(child.name);
                                            }}
                                        >
                                            <span
                                                className={`size-4 flex-shrink-0 transition-transform i-lucide-chevron-down ${
                                                    expandedSubGroup === child.name ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                                {expandedSubGroup === child.name ? (
                                    <ul className="m-0 p-0 list-none ltr:pl-4 rtl:pr-4 mt-1 overflow-hidden">
                                        {child.children
                                            .filter(subChild => subChild.to)
                                            .map(subChild => (
                                                <li key={subChild.name} className="py-0.5">
                                                    <PopoverItem
                                                        child={subChild}
                                                        active={isActive(subChild)}
                                                        onNavigate={navigateAndClose}
                                                    />
                                                </li>
                                            ))}
                                    </ul>
                                ) : null}
                            </li>
                        ) : (
                            <li key={child.name} className="py-0.5">
                                <PopoverItem child={child} active={isActive(child)} onNavigate={navigateAndClose} />
                            </li>
                        ),
                    )}
                </ul>
            </div>
        </div>
    );
}

function PopoverItem({
    child,
    active,
    onNavigate,
}: {
    child: SidebarMenuChild;
    active: boolean;
    onNavigate: (to: string) => void;
}) {
    return (
        <button
            type="button"
            className={`flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-sm text-left rtl:text-right transition-colors duration-150 ease-out ${
                active ? 'text-n-slate-12 bg-n-alpha-2' : 'text-n-slate-11 hover:bg-n-alpha-2'
            }`}
            onClick={() => child.to && onNavigate(child.to)}
        >
            {child.component ? (
                child.component({ label: child.label, active, badgeCount: child.badgeCount })
            ) : (
                <>
                    {child.icon ? <Icon icon={child.icon} className="size-4 flex-shrink-0" /> : null}
                    <span className="flex-1 truncate">{child.label}</span>
                    <SidebarUnreadBadge count={child.badgeCount} />
                </>
            )}
        </button>
    );
}
