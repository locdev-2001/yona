import { usePage } from '@inertiajs/react';

import type { SuperAdminPageProps } from '../types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuLabel, DropdownMenuLink, DropdownMenuSeparator } from '../ui/DropdownMenu';
import { Icon } from '../ui/Icon';
import { Kbd } from '../ui/Kbd';
import { useConsoleLabels } from '../ui/labels';
import { findActiveItem, useConsoleNavigation } from './navigation';

function isMac(): boolean {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export default function Topbar({
    collapsed,
    onToggleCollapsed,
    onOpenMobileNav,
    onOpenSearch,
}: {
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onOpenMobileNav: () => void;
    onOpenSearch: () => void;
}) {
    const { superAdmin } = usePage<SuperAdminPageProps>().props;
    const { groups, currentPath } = useConsoleNavigation();
    const label = useConsoleLabels();
    const active = findActiveItem(groups, currentPath);
    const user = superAdmin.currentUser;

    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-console-border bg-console-card/90 px-3 backdrop-blur md:px-4">
            <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={label('open_menu')} onClick={onOpenMobileNav}>
                <Icon name="i-lucide-menu" />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                className="hidden md:inline-flex"
                aria-label={label(collapsed ? 'expand_sidebar' : 'collapse_sidebar')}
                aria-pressed={collapsed}
                onClick={onToggleCollapsed}
            >
                <Icon name={collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'} />
            </Button>

            {active ? (
                <nav aria-label="breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
                    <span className="truncate text-console-muted-foreground">{active.group.label}</span>
                    <Icon name="i-lucide-chevron-right" className="size-3.5 text-console-muted-foreground" />
                    <span className="truncate font-medium text-console-foreground">{active.item.label}</span>
                </nav>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
                <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label={label('search')}
                    aria-keyshortcuts="Control+K Meta+K"
                    className="inline-flex size-8 items-center justify-center gap-2 rounded-md border border-console-border bg-console-card text-sm text-console-muted-foreground shadow-sm outline-none transition-colors hover:bg-console-accent focus-visible:ring-2 focus-visible:ring-console-ring/50 sm:w-64 sm:justify-start sm:px-2.5"
                >
                    <Icon name="i-lucide-search" />
                    <span className="hidden flex-1 text-left font-normal sm:inline">{label('search_shortcut_hint')}</span>
                    <Kbd className="hidden sm:inline-flex">{isMac() ? '⌘' : 'Ctrl'} K</Kbd>
                </button>

                <DropdownMenu
                    label={label('user_menu')}
                    triggerClassName="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console-ring/50"
                    trigger={<Avatar name={user?.name ?? superAdmin.installationName} />}
                >
                    {user ? (
                        <>
                            <DropdownMenuLabel>
                                <p className="truncate font-medium">{user.name}</p>
                                <p className="truncate text-xs text-console-muted-foreground">{user.email}</p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                        </>
                    ) : null}
                    <DropdownMenuLink href="/">
                        <Icon name="i-lucide-house" />
                        {label('back_to_app')}
                    </DropdownMenuLink>
                    <DropdownMenuLink href="/admin/logout" className="text-console-destructive-foreground">
                        <Icon name="i-lucide-log-out" />
                        {label('logout')}
                    </DropdownMenuLink>
                </DropdownMenu>
            </div>
        </header>
    );
}
