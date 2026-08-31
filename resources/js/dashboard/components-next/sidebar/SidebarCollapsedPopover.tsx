import { Link } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import SidebarUnreadBadge from './SidebarUnreadBadge';
import type { SidebarMenuChild } from './provider';

// Port rút gọn từ sidebar/SidebarCollapsedPopover.vue — flyout khi sidebar thu gọn
// (sort menu + keyboard nav lược).
interface SidebarCollapsedPopoverProps {
    label: string;
    children: SidebarMenuChild[];
    activeChild?: SidebarMenuChild;
    triggerRect: { top: number };
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export default function SidebarCollapsedPopover({
    label,
    children,
    activeChild,
    triggerRect,
    onMouseEnter,
    onMouseLeave,
}: SidebarCollapsedPopoverProps) {
    return (
        <div
            data-popover-content
            className="fixed z-50 ltr:left-14 rtl:right-14 min-w-56 max-w-72 max-h-[70vh] overflow-y-auto no-scrollbar rounded-xl border border-n-weak bg-n-alpha-3 backdrop-blur-[100px] shadow-lg p-2"
            style={{ top: Math.max(8, triggerRect.top - 8) }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="px-2 py-1.5 text-xs font-medium text-n-slate-10">{label}</div>
            <ul className="grid gap-0.5 m-0 list-none reset-base">
                {children.flatMap(child =>
                    child.children
                        ? [
                              <li
                                  key={child.name}
                                  className="px-2 pt-2 pb-1 text-xs font-medium text-n-slate-10 select-none"
                              >
                                  {child.label}
                              </li>,
                              ...child.children.map(subChild => (
                                  <PopoverLeaf
                                      key={subChild.name}
                                      child={subChild}
                                      active={activeChild?.name === subChild.name}
                                  />
                              )),
                          ]
                        : [
                              <PopoverLeaf
                                  key={child.name}
                                  child={child}
                                  active={activeChild?.name === child.name}
                              />,
                          ],
                )}
            </ul>
        </div>
    );
}

function PopoverLeaf({ child, active }: { child: SidebarMenuChild; active: boolean }) {
    if (!child.to) return null;

    return (
        <li>
            <Link
                href={child.to}
                className={`flex h-8 items-center gap-2 px-2 py-1 rounded-lg text-sm min-w-0 hover:bg-n-alpha-2 ${
                    active ? 'text-n-slate-12 bg-n-alpha-2' : 'text-n-slate-11'
                }`}
            >
                {child.icon ? <Icon icon={child.icon} className="size-4 flex-shrink-0" /> : null}
                <span className="flex-1 truncate">{child.label}</span>
                <SidebarUnreadBadge count={child.badgeCount} />
            </Link>
        </li>
    );
}
