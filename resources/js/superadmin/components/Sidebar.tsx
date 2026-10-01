import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

import type { ConsoleNavItem, SuperAdminPageProps } from '../types';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import { Icon } from '../ui/Icon';
import { useConsoleLabels } from '../ui/labels';
import { isChildActive, isItemActive, navIcon, useConsoleNavigation } from './navigation';

const ITEM_CLASS =
    'flex w-full items-center gap-2 rounded-md text-sm outline-none transition-colors hover:bg-console-accent hover:text-console-foreground focus-visible:ring-2 focus-visible:ring-console-ring/50';
const ACTIVE_CLASS = 'bg-console-accent font-medium text-console-foreground';
const IDLE_CLASS = 'text-console-foreground/80';

function NavLink({
    item,
    active,
    collapsed,
    onNavigate,
}: {
    item: ConsoleNavItem;
    active: boolean;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    const label = useConsoleLabels();
    const className = cn(ITEM_CLASS, 'h-8', collapsed ? 'justify-center' : 'px-2', active ? ACTIVE_CLASS : IDLE_CLASS);
    const content = (
        <>
            <Icon name={navIcon(item.key)} />
            {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
            {item.external && !collapsed ? (
                <Icon name="i-lucide-external-link" className="ml-auto size-3.5 text-console-muted-foreground" />
            ) : null}
        </>
    );

    if (item.external) {
        return (
            <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? `${item.label} (${label('opens_new_tab')})` : undefined}
                className={className}
                onClick={onNavigate}
            >
                {content}
                <span className="sr-only">({label('opens_new_tab')})</span>
            </a>
        );
    }

    return (
        <Link
            href={item.url}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={className}
            onClick={onNavigate}
        >
            {content}
        </Link>
    );
}

function NavItemWithChildren({
    item,
    collapsed,
    onNavigate,
}: {
    item: ConsoleNavItem;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    const { currentPath, currentUrl } = useConsoleNavigation();
    const active = isItemActive(item, currentPath);
    const [open, setOpen] = useState(active);

    if (collapsed) {
        return <NavLink item={item} active={active} collapsed onNavigate={onNavigate} />;
    }

    return (
        <>
            <button
                type="button"
                aria-expanded={open}
                className={cn(ITEM_CLASS, 'h-8 px-2', active ? 'text-console-foreground' : IDLE_CLASS)}
                onClick={() => setOpen(value => !value)}
            >
                <Icon name={navIcon(item.key)} />
                <span className="truncate">{item.label}</span>
                <Icon
                    name="i-lucide-chevron-right"
                    className={cn('ml-auto size-3.5 transition-transform', open && 'rotate-90')}
                />
            </button>
            {open ? (
                <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-console-border pl-2">
                    {item.children?.map(child => {
                        const childActive = isChildActive(item, child, currentUrl);

                        return (
                            <li key={child.key}>
                                <Link
                                    href={child.url}
                                    aria-current={childActive ? 'page' : undefined}
                                    className={cn(ITEM_CLASS, 'h-7 px-2', childActive ? ACTIVE_CLASS : IDLE_CLASS)}
                                    onClick={onNavigate}
                                >
                                    <span className="truncate">{child.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </>
    );
}

// Nội dung thanh bên, dùng chung cho cột cố định trên máy tính và ngăn trượt trên
// điện thoại. `collapsed` chỉ còn icon (tên mục vẫn có cho trình đọc màn hình).
export function SidebarContent({
    collapsed = false,
    onNavigate,
    onClose,
}: {
    collapsed?: boolean;
    onNavigate?: () => void;
    onClose?: () => void;
}) {
    const { superAdmin } = usePage<SuperAdminPageProps>().props;
    const { groups, currentPath } = useConsoleNavigation();
    const label = useConsoleLabels();

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b border-console-border', collapsed ? 'justify-center px-2' : 'px-4')}>
                <Link href="/admin" className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-console-ring/50" onClick={onNavigate}>
                    <img alt="" src={superAdmin.logoThumbnail} className="size-7 shrink-0 rounded-md object-contain" />
                    {collapsed ? (
                        <span className="sr-only">{superAdmin.installationName}</span>
                    ) : (
                        <span className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-sm font-semibold text-console-foreground">{superAdmin.installationName}</span>
                            <span className="truncate text-xs text-console-muted-foreground">{label('console_name')}</span>
                        </span>
                    )}
                </Link>
                {onClose ? (
                    <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label={label('close')} onClick={onClose}>
                        <Icon name="i-lucide-x" />
                    </Button>
                ) : null}
            </div>

            <nav aria-label={label('navigation')} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
                {groups.map((group, index) => (
                    <div key={group.key} className="mb-3 last:mb-0">
                        {collapsed ? (
                            index > 0 ? <div aria-hidden="true" className="mx-2 mb-2 h-px bg-console-border" /> : null
                        ) : (
                            <p className="mb-1 px-2 text-xs font-medium text-console-muted-foreground">{group.label}</p>
                        )}
                        <ul className="flex flex-col gap-0.5" aria-label={collapsed ? group.label : undefined}>
                            {group.items.map(item => (
                                <li key={item.key}>
                                    {item.children?.length ? (
                                        <NavItemWithChildren item={item} collapsed={collapsed} onNavigate={onNavigate} />
                                    ) : (
                                        <NavLink
                                            item={item}
                                            active={isItemActive(item, currentPath)}
                                            collapsed={collapsed}
                                            onNavigate={onNavigate}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {collapsed ? null : (
                <div className="shrink-0 border-t border-console-border px-4 py-3 text-xs text-console-muted-foreground">
                    {superAdmin.installationName} {superAdmin.version}
                </div>
            )}
        </div>
    );
}
