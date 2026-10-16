import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Logo from 'dashboard/components-next/icon/Logo';
import SidebarGroup from './SidebarGroup';
import SidebarProfileMenu from './SidebarProfileMenu';
import SidebarAccountSwitcher from './SidebarAccountSwitcher';
import { buildMenuItems } from './menuItems';
import { useCustomViews } from 'dashboard/composables/useCustomViews';
import {
    SidebarContextProvider,
    useSidebarResize,
    COLLAPSED_THRESHOLD,
    MIN_WIDTH,
    MOBILE_DRAWER_WIDTH,
} from './provider';
import { filterMenuByRole } from './permissions';
import { useConversationUnreadCounts } from './useConversationUnreadCounts';
import { useNotificationsUnreadInboxCounts } from 'dashboard/notifications/useUnreadCount';
import NotificationBell from 'dashboard/notifications/components/NotificationBell';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';

const SETTINGS_GROUP_NAME = 'Settings';

// Từ 768px sidebar là rail icon cố định; chỉ trang Cài đặt mở rộng thành cây menu con
// và kéo giãn được (Cài đặt không có điều hướng riêng trong trang). Dưới 768px là
// ngăn kéo như cũ.
export default function Sidebar({
    isMobileSidebarOpen = false,
    onCloseMobileSidebar,
}: {
    isMobileSidebarOpen?: boolean;
    onCloseMobileSidebar: () => void;
}) {
    const { url, props } = usePage<DashboardPageProps>();
    const { currentAccount, currentAccountUser, inboxes = [], teams = [] } = props;
    const accountId = currentAccount.id;
    const role = currentAccountUser.role;
    const features = currentAccount.features ?? {};
    const conversationCustomViews = useCustomViews(accountId, 'conversation');
    const contactCustomViews = useCustomViews(accountId, 'contact');
    // watch([accountId, hasConversationUnreadCounts], fetchConversationUnreadCounts) của Sidebar.vue.
    const conversationUnreadCounts = useConversationUnreadCounts();
    // Badge từng kênh đếm y như số trên chuông, chỉ chia theo kênh — không theo cờ tính năng.
    const inboxUnreadCounts = useNotificationsUnreadInboxCounts();
    const unreadCounts = useMemo(
        () => ({ ...conversationUnreadCounts, inboxes: inboxUnreadCounts }),
        [conversationUnreadCounts, inboxUnreadCounts],
    );

    const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
    const isMobile = windowWidth < 768;

    const [expandedItem, setExpandedItemState] = useState<string | null>(null);
    const setExpandedItem = (name: string) =>
        setExpandedItemState(current => (current === name ? null : name));

    const { sidebarWidth, widthRef, isCollapsed, setSidebarWidth, saveWidth, snapToCollapsed, snapToExpanded } =
        useSidebarResize();

    const settingsPath = accountScopedUrl(accountId, 'settings');
    const currentPath = url.split('?')[0];
    const isSettingsPage = currentPath === settingsPath || currentPath.startsWith(`${settingsPath}/`);
    const isRail = !isMobile && (!isSettingsPage || isCollapsed);
    const effectiveWidth = isMobile ? MOBILE_DRAWER_WIDTH : isRail ? MIN_WIDTH : sidebarWidth;

    const [isResizing, setResizing] = useState(false);
    const resizeState = useRef({ startX: 0, startWidth: 0 });

    const [activePopover, setActivePopover] = useState<string | null>(null);
    const closeTimeout = useRef<number | undefined>(undefined);
    const scheduleClose = (delay = 150) => {
        window.clearTimeout(closeTimeout.current);
        closeTimeout.current = window.setTimeout(() => setActivePopover(null), delay);
    };
    const cancelClose = () => window.clearTimeout(closeTimeout.current);

    useEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const onWindowBlur = () => setActivePopover(null);
        window.addEventListener('blur', onWindowBlur);
        document.addEventListener('mouseleave', onWindowBlur);
        return () => {
            window.removeEventListener('blur', onWindowBlur);
            document.removeEventListener('mouseleave', onWindowBlur);
        };
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const getClientX = (event: MouseEvent | TouchEvent) =>
            'touches' in event ? event.touches[0].clientX : event.clientX;

        const onMove = (event: MouseEvent | TouchEvent) => {
            const delta = getClientX(event) - resizeState.current.startX;
            setSidebarWidth(resizeState.current.startWidth + delta);
        };
        const onEnd = () => {
            setResizing(false);
            Object.assign(document.body.style, { cursor: '', userSelect: '' });
            if (widthRef.current < COLLAPSED_THRESHOLD) {
                snapToCollapsed();
            } else {
                saveWidth();
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResizing]);

    const onResizeStart = (clientX: number) => {
        setResizing(true);
        resizeState.current = { startX: clientX, startWidth: widthRef.current };
        Object.assign(document.body.style, { cursor: 'col-resize', userSelect: 'none' });
    };

    const menuItems = useMemo(
        () =>
            filterMenuByRole(
                buildMenuItems(
                    accountId,
                    inboxes,
                    teams,
                    [],
                    unreadCounts,
                    conversationCustomViews,
                    contactCustomViews,
                ),
                role,
                features,
            ),
        [
            accountId,
            inboxes,
            teams,
            unreadCounts,
            conversationCustomViews,
            contactCustomViews,
            role,
            features,
        ],
    );

    const navGroups = isRail ? menuItems.filter(item => item.name !== SETTINGS_GROUP_NAME) : menuItems;
    const settingsGroup = isRail ? menuItems.find(item => item.name === SETTINGS_GROUP_NAME) : undefined;

    const asideRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isMobileSidebarOpen) return;
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (asideRef.current?.contains(target)) return;
            // Nền mờ của popover (panel chuông trên điện thoại) chỉ đóng popover, giữ ngăn kéo.
            if (target.closest('#mobile-sidebar-launcher, [data-popover-content], [data-popover-backdrop]')) return;
            onCloseMobileSidebar();
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [isMobileSidebarOpen, onCloseMobileSidebar]);

    return (
        <SidebarContextProvider
            value={{
                expandedItem,
                setExpandedItem,
                isCollapsed: isRail,
                opensFirstChildOnExpand: !isMobile,
                isResizing,
                sidebarWidth: effectiveWidth,
                activePopover,
                setActivePopover,
                scheduleClose,
                cancelClose,
            }}
        >
            <aside
                ref={asideRef}
                className={[
                    isRail ? 'bg-n-surface-rail sidebar-rail' : 'bg-n-surface-sidebar',
                    'flex flex-col text-sm pb-px fixed top-0 ltr:left-0 rtl:right-0 h-full max-md:h-dvh z-40 md:relative md:flex-shrink-0 md:ltr:translate-x-0 md:rtl:translate-x-0',
                    isMobileSidebarOpen ? 'shadow-overlay md:shadow-none' : 'ltr:-translate-x-full rtl:translate-x-full',
                    !isResizing ? 'transition-transform duration-200 ease-out md:transition-[width]' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={{ width: `${effectiveWidth}px` }}
            >
                <section className={`grid ${isRail ? 'mt-3 mb-6 gap-4' : 'mt-1 mb-4 gap-2'}`}>
                    <div
                        className={`flex gap-2 items-center min-w-0 ${
                            isRail ? 'justify-center px-1' : 'px-2'
                        }`}
                    >
                        {isRail ? (
                            <SidebarAccountSwitcher isCollapsed />
                        ) : (
                            <>
                                <div className="grid flex-shrink-0 place-content-center size-6">
                                    <Logo className="size-4" />
                                </div>
                                <div className="flex-shrink-0 w-px h-3 bg-n-strong" />
                                <SidebarAccountSwitcher />
                            </>
                        )}
                    </div>
                    <div className={`flex gap-2 min-w-0 ${isRail ? 'flex-col items-center' : 'px-2'}`}>
                        {!isRail ? (
                            <Link
                                href={accountScopedUrl(accountId, 'search')}
                                title={t('SIDEBAR.GLOBAL_SEARCH_HINT')}
                                className="flex gap-2 items-center px-2 py-1 w-full min-w-0 h-7 rounded-lg bg-n-surface-field hover:bg-n-surface-field-hover transition-colors duration-100 ease-out"
                            >
                                <span className="flex-shrink-0 i-lucide-search size-4 text-n-slate-10" />
                                <span className="flex-grow min-w-0 truncate text-start text-n-slate-10">
                                    {t('SIDEBAR.GLOBAL_SEARCH')}
                                </span>
                            </Link>
                        ) : (
                            <Link
                                href={accountScopedUrl(accountId, 'search')}
                                className="flex items-center justify-center size-10 rounded text-n-slate-11 hover:bg-n-surface-hover hover:text-n-slate-12 transition-colors duration-100 ease-out"
                                title={t('SIDEBAR.GLOBAL_SEARCH_HINT')}
                            >
                                <span className="i-lucide-search size-[18px]" />
                            </Link>
                        )}
                        <NotificationBell isCollapsed={isRail} onNavigate={onCloseMobileSidebar} />
                    </div>
                </section>
                <nav
                    className={`grid overflow-y-scroll flex-grow gap-2 pb-5 no-scrollbar min-w-0 ${
                        isRail ? 'px-1' : 'px-2'
                    }`}
                >
                    <ul
                        className={`flex flex-col gap-1 m-0 list-none min-w-0 ${
                            isRail ? 'items-center' : ''
                        }`}
                    >
                        {navGroups.map(item => (
                            <SidebarGroup key={item.name} accountId={accountId} {...item} />
                        ))}
                    </ul>
                </nav>
                <section className="flex relative flex-col flex-shrink-0 gap-1 justify-between items-center pb-[env(safe-area-inset-bottom)]">
                    <div
                        className={`pointer-events-none absolute inset-x-0 -top-[1.938rem] h-8 bg-gradient-to-t to-transparent ${
                            isRail ? 'from-n-surface-rail' : 'from-n-surface-sidebar'
                        }`}
                    />
                    {settingsGroup ? (
                        <ul className="flex flex-col items-center m-0 list-none w-full">
                            <SidebarGroup accountId={accountId} {...settingsGroup} />
                        </ul>
                    ) : null}
                    <div
                        className={`px-1 py-1.5 flex-shrink-0 flex w-full z-50 gap-2 items-center ${
                            isRail ? 'justify-center' : 'justify-between'
                        }`}
                    >
                        <SidebarProfileMenu isCollapsed={isRail} />
                    </div>
                </section>
                {!isMobile && isSettingsPage ? (
                    <div
                        className="absolute top-0 h-full w-1 cursor-col-resize z-40 ltr:right-0 rtl:left-0 group"
                        onMouseDown={event => {
                            event.preventDefault();
                            onResizeStart(event.clientX);
                        }}
                        onTouchStart={event => {
                            onResizeStart(event.touches[0].clientX);
                        }}
                        onDoubleClick={() => (isCollapsed ? snapToExpanded() : snapToCollapsed())}
                    >
                        <div
                            className={`absolute top-0 h-full w-px ltr:right-0 rtl:left-0 bg-transparent group-hover:bg-n-brand transition-colors ${
                                isResizing ? 'bg-n-brand' : ''
                            }`}
                        />
                    </div>
                ) : null}
            </aside>
        </SidebarContextProvider>
    );
}
