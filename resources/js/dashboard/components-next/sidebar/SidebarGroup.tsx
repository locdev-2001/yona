import { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import SidebarGroupHeader from './SidebarGroupHeader';
import SidebarGroupLeaf from './SidebarGroupLeaf';
import SidebarSubGroup from './SidebarSubGroup';
import SidebarGroupEmptyLeaf from './SidebarGroupEmptyLeaf';
import SidebarCollapsedPopover from './SidebarCollapsedPopover';
import { useSidebarContext } from './provider';
import type { SidebarMenuChild, SidebarMenuItem } from './provider';

// Port từ sidebar/SidebarGroup.vue — active detection theo URL path (Inertia)
// thay route name (vue-router); Policy/permission wrapper vào cùng RBAC sau.

function currentPath(url: string): string {
    return url.split('?')[0];
}

function queryPairs(url: string): [string, string][] {
    return [...new URLSearchParams(url.split('?')[1] ?? '')];
}

function matchesPath(child: SidebarMenuChild, path: string): boolean {
    const childPath = currentPath(child.to!);
    if (path === childPath || path.startsWith(`${childPath}/`)) return true;
    return (child.activeOn ?? []).some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

// Mục mang query (kênh/nhãn đang lọc) cụ thể hơn mục cùng đường dẫn không query,
// nên được ưu tiên; nó chỉ khớp khi URL hiện tại có đủ mọi cặp khoá–giá trị của nó.
export function findActiveChild(children: SidebarMenuChild[], url: string): SidebarMenuChild | undefined {
    const path = currentPath(url);
    const current = new URLSearchParams(url.split('?')[1] ?? '');
    const routable = children.filter(child => child.to && matchesPath(child, path));
    const withQuery = routable.filter(child => queryPairs(child.to!).length > 0);

    return (
        withQuery.find(child => queryPairs(child.to!).every(([key, value]) => current.getAll(key).includes(value))) ??
        routable.find(child => queryPairs(child.to!).length === 0)
    );
}

export default function SidebarGroup({
    name,
    label,
    icon = null,
    to,
    activeOn = [],
    children,
    getterKeys = {},
    accountId,
}: SidebarMenuItem & { accountId: number }) {
    const { url } = usePage();
    const path = currentPath(url);

    const {
        expandedItem,
        setExpandedItem,
        isCollapsed,
        opensFirstChildOnExpand,
        isResizing,
        activePopover,
        setActivePopover,
        scheduleClose,
        cancelClose,
    } = useSidebarContext();

    const isExpanded = expandedItem === name;
    const isExpandable = children !== undefined;
    const hasChildren = Array.isArray(children) && children.length > 0;

    const navigableChildren = (children ?? []).flatMap(child => child.children ?? child);

    // Nhóm con có nút riêng (Kênh khi ẩn hết) vẫn hiện để mở lại được.
    const visibleChildren = (children ?? []).filter(child =>
        child.children
            ? Boolean(child.headerAction || child.replacement) || child.children.some(subChild => subChild.to)
            : Boolean(child.to),
    );
    const accessibleItems = visibleChildren.flatMap(child => child.children ?? child).filter(child => child.to);
    const hasAccessibleChildren = visibleChildren.length > 0;

    const isActive = to ? path === currentPath(to) || activeOn.some(prefix => path.startsWith(prefix)) : false;

    const activeChild = findActiveChild(navigableChildren, url);
    const hasActiveChild = activeChild !== undefined;

    const isPopoverOpen = activePopover === name;
    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState({ top: 0 });

    useEffect(() => {
        if (hasActiveChild) setExpandedItem(name);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasActiveChild]);

    if (hasChildren && !hasAccessibleChildren) return null;

    const openPopover = () => {
        if (triggerRef.current) {
            setTriggerRect({ top: triggerRef.current.getBoundingClientRect().top });
        }
        setActivePopover(name);
    };

    const handleCollapsedClick = () => {
        if (hasChildren && hasAccessibleChildren) {
            router.visit(accessibleItems[0].to!);
        }
    };

    const toggleTrigger = () => {
        if (opensFirstChildOnExpand && hasAccessibleChildren && !isExpanded && !hasActiveChild) {
            router.visit(accessibleItems[0].to!);
        }
        setExpandedItem(name);
    };

    const isLastVisibleChild = (child: SidebarMenuChild) =>
        visibleChildren[visibleChildren.length - 1] === child;

    if (isCollapsed) {
        const collapsedClasses = `flex items-center justify-center size-10 rounded-lg ${
            isActive || hasActiveChild
                ? 'text-n-slate-12 bg-n-surface-selected'
                : 'text-n-slate-11 hover:bg-n-surface-hover'
        }`;

        return (
            <li className="grid gap-1 text-sm cursor-pointer select-none min-w-0">
                <div
                    className="relative"
                    onMouseEnter={() => {
                        if (!hasChildren || isResizing) return;
                        cancelClose();
                        openPopover();
                    }}
                    onMouseLeave={() => {
                        if (!hasChildren) return;
                        scheduleClose(200);
                    }}
                >
                    <div ref={triggerRef}>
                        {to && !hasChildren ? (
                            <Link href={to} className={collapsedClasses} title={label}>
                                {icon ? <Icon icon={icon} className="size-4" /> : null}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                className={collapsedClasses}
                                title={label}
                                onClick={hasChildren ? handleCollapsedClick : undefined}
                            >
                                {icon ? <Icon icon={icon} className="size-4" /> : null}
                            </button>
                        )}
                    </div>
                    {hasChildren && isPopoverOpen ? (
                        <SidebarCollapsedPopover
                            label={label}
                            children={children!}
                            activeChild={activeChild}
                            triggerRect={triggerRect}
                            onClose={() => setActivePopover(null)}
                            onMouseEnter={cancelClose}
                            onMouseLeave={() => scheduleClose(100)}
                        />
                    ) : null}
                </div>
            </li>
        );
    }

    return (
        <li className="grid gap-1 text-sm cursor-pointer select-none min-w-0">
            <SidebarGroupHeader
                icon={icon}
                label={label}
                to={to}
                count={getterKeys.count}
                showBadge={getterKeys.badge}
                isActive={isActive}
                hasActiveChild={hasActiveChild}
                expandable={hasChildren}
                isExpanded={isExpanded}
                onToggle={toggleTrigger}
            />
            {hasChildren ? (
                <ul className={`grid m-0 list-none min-w-0 ${isExpanded || hasActiveChild ? '' : 'hidden'}`}>
                    {visibleChildren.map(child =>
                        child.children ? (
                            <SidebarSubGroup
                                key={child.name}
                                name={`${name}:${child.name}`}
                                accountId={accountId}
                                label={child.label}
                                icon={child.icon}
                                children={child.children}
                                collapsible={child.collapsible}
                                showTreeLine={child.showTreeLine}
                                headerAction={child.headerAction}
                                replacement={child.replacement}
                                endTreeLine={child.showTreeLine && isLastVisibleChild(child)}
                                isExpanded={isExpanded}
                                activeChild={activeChild}
                            />
                        ) : (
                            <SidebarGroupLeaf
                                key={child.name}
                                label={child.label}
                                to={child.to!}
                                icon={child.icon}
                                badgeCount={child.badgeCount}
                                component={child.component}
                                actions={child.actions}
                                active={activeChild?.name === child.name}
                                hidden={!(isExpanded || activeChild?.name === child.name)}
                            />
                        ),
                    )}
                </ul>
            ) : isExpandable && isExpanded ? (
                <ul>
                    <SidebarGroupEmptyLeaf />
                </ul>
            ) : null}
        </li>
    );
}
