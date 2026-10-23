import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    ArrowUpRight,
    CircleHelp,
    ChevronDown,
    ChevronRight,
    Menu,
    Moon,
    PanelLeftOpen,
    Search,
    Settings2,
    Sun,
    X,
    type IconComponent,
} from '@admin/components/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@admin/components/ui/collapsible';
import { PreviewButton, SearchField } from './components';
import { previewCopy, previewText, useDesignCopy } from './copy';
import { dimensionTokens, spacingPixels, type PreviewTheme } from './tokens';
import { useCardSurface } from './widget-card';
import './navigation-sidebar.css';

export type SidebarItem = {
    id: string;
    label: string;
    Icon: IconComponent;
    href?: string;
    external?: boolean;
    count?: string;
    notificationCount?: number;
    children?: SidebarItem[];
};
export type SidebarGroup = { id: string; label: string; items: SidebarItem[] };
function normalizeMenuLabel(value: string): string {
    return value
        .toLocaleLowerCase('vi')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replaceAll('đ', 'd');
}

function hasActiveItem(item: SidebarItem, activeId: string): boolean {
    return item.id === activeId || Boolean(item.children?.some((child) => hasActiveItem(child, activeId)));
}
function filterMenuItems(items: SidebarItem[], query: string): SidebarItem[] {
    return items.flatMap((item) => {
        if (!query || normalizeMenuLabel(item.label).includes(query)) return [item];
        const children = item.children ? filterMenuItems(item.children, query) : [];
        return children.length ? [{ ...item, children }] : [];
    });
}
function menuItemLabel(item: SidebarItem, format = previewText): string {
    return [
        item.label,
        item.count,
        item.notificationCount ? format('sidebar_notification_count', item.notificationCount) : undefined,
    ]
        .filter(Boolean)
        .join(' · ');
}
function SidebarItemContent({ item, expanded }: { item: SidebarItem; expanded?: boolean }) {
    return (
        <>
            <item.Icon />
            <span className="sidebar-item-label">{item.label}</span>
            <span className="sidebar-item-trailing">
                {item.count && (
                    <span className="sidebar-item-count" aria-hidden="true">
                        {item.count}
                    </span>
                )}
                {Boolean(item.notificationCount) && (
                    <span className="sidebar-item-notification" aria-hidden="true">
                        {item.notificationCount! > 9 ? '9+' : item.notificationCount}
                    </span>
                )}
                {Boolean(item.children?.length) && (
                    <ChevronDown className="sidebar-submenu-chevron" data-open={expanded} aria-hidden="true" />
                )}
            </span>
        </>
    );
}
function SidebarNavigationItem({
    item,
    activeId,
    onNavigate,
    collapsed,
    filtering,
}: {
    item: SidebarItem;
    activeId: string;
    onNavigate: (id: string) => void;
    collapsed: boolean;
    filtering: boolean;
}) {
    const { copy: previewCopy, text: previewText } = useDesignCopy();
    const [expanded, setExpanded] = useState(() => hasActiveItem(item, activeId));
    const hasChildren = Boolean(item.children?.length);
    const childActive = Boolean(item.children?.some((child) => hasActiveItem(child, activeId)));
    useEffect(() => {
        if (childActive) setExpanded(true);
    }, [childActive]);
    if (!hasChildren) {
        const navigationProps = {
            className: 'sidebar-nav-item',
            'data-active': activeId === item.id,
            'aria-current': activeId === item.id ? 'page' as const : undefined,
            'aria-label': menuItemLabel(item, previewText),
            title: collapsed ? menuItemLabel(item, previewText) : undefined,
        };
        return item.href ? (
            <a
                {...navigationProps}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={(event) => {
                    if (item.external || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onNavigate(item.id);
                }}
            >
                <SidebarItemContent item={item} />
            </a>
        ) : (
            <button {...navigationProps} type="button" onClick={() => onNavigate(item.id)}>
                <SidebarItemContent item={item} />
            </button>
        );
    }
    if (collapsed)
        return (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <button
                            type="button"
                            className="sidebar-nav-item sidebar-submenu-trigger"
                            data-active={childActive}
                        />
                    }
                    aria-label={previewText('sidebar_open_submenu', menuItemLabel(item, previewText))}
                >
                    <SidebarItemContent item={item} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="right"
                    align="start"
                    sideOffset={spacingPixels('control-padding') + spacingPixels('control-gap')}
                    className="catalogue-popup sidebar-flyout"
                >
                    <div className="sidebar-flyout-heading">{item.label}</div>
                    {item.children!.map((child) => (
                        <DropdownMenuItem
                            key={child.id}
                            className="sidebar-flyout-item"
                            data-active={activeId === child.id}
                            aria-current={activeId === child.id ? 'page' : undefined}
                            render={child.href ? <a href={child.href} target={child.external ? '_blank' : undefined} rel={child.external ? 'noreferrer' : undefined} /> : undefined}
                            onClick={(event) => {
                                if (child.external || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                                event.preventDefault();
                                onNavigate(child.id);
                            }}
                        >
                            <child.Icon />
                            {child.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    const open = filtering || expanded;
    return (
        <Collapsible open={open} onOpenChange={setExpanded} className="sidebar-branch">
            <CollapsibleTrigger
                render={
                    <button
                        type="button"
                        className="sidebar-nav-item sidebar-submenu-trigger"
                        data-child-active={childActive}
                    />
                }
                aria-label={menuItemLabel(item, previewText)}
            >
                <SidebarItemContent item={item} expanded={open} />
            </CollapsibleTrigger>
            <CollapsibleContent className="sidebar-submenu-panel">
                <div className="sidebar-submenu" role="group" aria-label={menuItemLabel(item, previewText)}>
                    {item.children!.map((child) => (
                        <SidebarNavigationItem
                            key={child.id}
                            item={child}
                            activeId={activeId}
                            onNavigate={onNavigate}
                            collapsed={false}
                            filtering={filtering}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function NavigationSidebar({
    groups,
    activeId,
    onNavigate,
    collapsed,
    onCollapsedChange,
    mobileOpen,
    onMobileClose,
    theme,
    onThemeChange,
    onHelp,
    onCustomize,
    account,
    homeId = 'overview',
    brandName = 'Yona',
}: {
    groups: SidebarGroup[];
    activeId: string;
    onNavigate: (id: string) => void;
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
    theme: PreviewTheme;
    onThemeChange: () => void;
    onHelp?: () => void;
    onCustomize?: () => void;
    account?: { name: string; subtitle: string; initials: string; menu: ReactNode };
    homeId?: string;
    brandName?: string;
}) {
    const { copy: previewCopy, text: previewText } = useDesignCopy();
    const [query, setQuery] = useState('');
    const accountSurface = useCardSurface<HTMLButtonElement>('top-right', {
        cutoutSize: Number.parseFloat(dimensionTokens['navigation-account-cutout-size']),
        maxCutoutHeightRatio: 0.5,
    });
    const searchRef = useRef<HTMLInputElement>(null);
    const focusSearchRef = useRef(false);
    const asideRef = useRef<HTMLElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const visibleGroups = groups
        .map((group) => ({ ...group, items: filterMenuItems(group.items, normalizeMenuLabel(query.trim())) }))
        .filter((group) => group.items.length > 0);
    useEffect(() => {
        if (!collapsed && focusSearchRef.current) {
            searchRef.current?.focus();
            focusSearchRef.current = false;
        }
    }, [collapsed]);
    useEffect(() => {
        if (!mobileOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [mobileOpen]);
    function toggleCollapsed() {
        setQuery('');
        onCollapsedChange(!collapsed);
    }
    return (
        <>
            {mobileOpen && (
                <button className="sidebar-scrim" aria-label={previewCopy.dong_dieu_huong} onClick={onMobileClose} />
            )}
            <aside
                ref={asideRef}
                className={`preview-sidebar navigation-sidebar ${mobileOpen ? 'is-open' : ''}`}
                data-collapsed={collapsed}
                aria-label={previewCopy.dieu_huong_quan_tri}
                role={mobileOpen ? 'dialog' : undefined}
                aria-modal={mobileOpen || undefined}
                onKeyDown={(event) => {
                    if (!mobileOpen) return;
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        onMobileClose();
                        return;
                    }
                    if (event.key !== 'Tab') return;
                    const focusable = Array.from(
                        asideRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input') ?? [],
                    ).filter((element) => element.getClientRects().length > 0);
                    const first = focusable[0],
                        last = focusable[focusable.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last?.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first?.focus();
                    }
                }}
            >
                <header className="sidebar-header">
                    <div className="sidebar-brand-row">
                        <a
                            className="sidebar-brand"
                            href="#preview-main"
                            aria-label={previewCopy.sidebar_home}
                            onClick={(event) => {
                                event.preventDefault();
                                setQuery('');
                                onNavigate(homeId);
                            }}
                        >
                            <img
                                className="sidebar-brand-logo"
                                src={theme === 'dark' ? '/brand-assets/logo_dark.png' : '/brand-assets/logo.png'}
                                alt={brandName}
                                width={393}
                                height={128}
                            />
                        </a>
                        <PreviewButton
                            appearance="ghost"
                            className="sidebar-collapse"
                            onClick={toggleCollapsed}
                            aria-label={collapsed ? previewCopy.sidebar_expand : previewCopy.sidebar_collapse}
                            aria-expanded={!collapsed}
                            title={collapsed ? previewCopy.sidebar_expand : previewCopy.sidebar_collapse}
                        >
                            {collapsed ? <PanelLeftOpen /> : <Menu />}
                        </PreviewButton>
                        <PreviewButton
                            ref={closeRef}
                            appearance="ghost"
                            className="sidebar-close-mobile"
                            aria-label={previewCopy.dong_dieu_huong}
                            onClick={onMobileClose}
                        >
                            <X />
                        </PreviewButton>
                    </div>
                    <div className="sidebar-search-expanded">
                        <SearchField
                            inputRef={searchRef}
                            label={previewCopy.sidebar_search}
                            placeholder={previewCopy.sidebar_search_placeholder}
                            clearLabel={previewCopy.sidebar_clear_search}
                            value={query}
                            onChange={setQuery}
                        />
                    </div>
                    <PreviewButton
                        appearance="ghost"
                        className="sidebar-search-collapsed"
                        aria-label={previewCopy.sidebar_search}
                        title={previewCopy.sidebar_search}
                        onClick={() => {
                            focusSearchRef.current = true;
                            onCollapsedChange(false);
                        }}
                    >
                        <Search />
                    </PreviewButton>
                </header>
                <div className="sidebar-scroll-area">
                    {visibleGroups.map((group) => (
                        <section key={group.id} className="sidebar-group" aria-label={group.label}>
                            <h2>{group.label}</h2>
                            <nav aria-label={group.label}>
                                {group.items.map((item) => (
                                    <SidebarNavigationItem
                                        key={item.id}
                                        item={item}
                                        activeId={activeId}
                                        onNavigate={onNavigate}
                                        collapsed={collapsed && !mobileOpen}
                                        filtering={query.trim().length > 0}
                                    />
                                ))}
                            </nav>
                        </section>
                    ))}
                    {visibleGroups.length === 0 && (
                        <div className="sidebar-search-empty" role="status">
                            <p>{previewCopy.sidebar_no_results}</p>
                            <button
                                onClick={() => {
                                    setQuery('');
                                    searchRef.current?.focus();
                                }}
                            >
                                {previewCopy.sidebar_clear_search}
                            </button>
                        </div>
                    )}
                </div>
                <footer className="sidebar-account-area">
                    {onHelp && <button
                        type="button"
                        className="sidebar-nav-item sidebar-help"
                        aria-label={previewCopy.huong_dan_ban_xem_truoc}
                        title={collapsed ? previewCopy.huong_dan_ban_xem_truoc : undefined}
                        onClick={onHelp}
                    >
                        <CircleHelp />
                        <span className="sidebar-item-label">{previewCopy.sidebar_help}</span>
                    </button>}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={<button ref={accountSurface.rootRef} type="button" className="sidebar-account" />}
                            aria-label={previewCopy.sidebar_account_menu}
                        >
                            {accountSurface.geometry}
                            <span
                                className="sidebar-account-surface"
                                style={accountSurface.surfaceStyle}
                                aria-hidden="true"
                            />
                            <span className="sidebar-account-identity">
                                <span className="sidebar-account-avatar">{account?.initials ?? 'YN'}</span>
                                <span className="sidebar-account-info">
                                    <strong>{account?.name ?? previewCopy.quan_tri_vien}</strong>
                                    <span>{account?.subtitle ?? previewCopy.khong_gian_minh_hoa}</span>
                                </span>
                            </span>
                            <span className="sidebar-account-action" aria-hidden="true">
                                <ChevronRight className="sidebar-account-more" />
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="catalogue-popup sidebar-account-menu"
                            side="right"
                            align="end"
                            sideOffset={spacingPixels('control-gap')}
                            collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'start' }}
                        >
                            {account ? account.menu : <>
                            <DropdownMenuItem onClick={onCustomize}>
                                <Settings2 />
                                {previewCopy.tuy_chinh_giao_dien}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onThemeChange}>
                                {theme === 'dark' ? <Sun /> : <Moon />}
                                {theme === 'dark'
                                    ? previewCopy.chuyen_sang_giao_dien_sang
                                    : previewCopy.chuyen_sang_giao_dien_toi}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onHelp}>
                                <CircleHelp />
                                {previewCopy.huong_dan_ban_xem_truoc}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                render={
                                    <a
                                        href="https://dribbble.com/shots/24328826-Out-of-Dark-Customer-journey"
                                        target="_blank"
                                        rel="noreferrer"
                                    />
                                }
                            >
                                <ArrowUpRight />
                                {previewCopy.xem_thiet_ke_tham_chieu}
                            </DropdownMenuItem>
                            </>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </footer>
            </aside>
        </>
    );
}
