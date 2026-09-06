import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Logo from 'dashboard/components-next/icon/Logo';
import SidebarGroup from './SidebarGroup';
import SidebarProfileMenu from './SidebarProfileMenu';
import SidebarAccountSwitcher from './SidebarAccountSwitcher';
import { buildMenuItems } from './menuItems';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { labelsOnSidebar } from 'dashboard/conversation/labelHelpers';
import { SidebarContextProvider, useSidebarResize, COLLAPSED_THRESHOLD } from './provider';
import { filterMenuByRole } from './permissions';
import { useConversationUnreadCounts } from './useConversationUnreadCounts';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/sidebar/Sidebar.vue
// (ComposeConversation vào B3; ChangelogCard cloud-only bỏ; sort menu +
// keyboard shortcuts vào sau; SidebarSortMenu chưa port)
export default function Sidebar({
    isMobileSidebarOpen = false,
    onCloseMobileSidebar,
}: {
    isMobileSidebarOpen?: boolean;
    onCloseMobileSidebar: () => void;
}) {
    const { currentAccount, currentAccountUser, inboxes = [], teams = [] } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const role = currentAccountUser.role;
    const features = currentAccount.features ?? {};
    // Sidebar.vue dispatch `labels/get` khi mount; nhóm Labels đọc getLabelsOnSidebar.
    const accountLabels = useLabelsList(accountId);
    // watch([accountId, hasConversationUnreadCounts], fetchConversationUnreadCounts) của Sidebar.vue.
    const unreadCounts = useConversationUnreadCounts();

    const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
    const isMobile = windowWidth < 768;

    const [expandedItem, setExpandedItemState] = useState<string | null>(null);
    const setExpandedItem = (name: string) =>
        setExpandedItemState(current => (current === name ? null : name));

    const { sidebarWidth, widthRef, isCollapsed, setSidebarWidth, saveWidth, snapToCollapsed, snapToExpanded } =
        useSidebarResize();

    const isEffectivelyCollapsed = !isMobile && isCollapsed;

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
                buildMenuItems(accountId, inboxes, teams, labelsOnSidebar(accountLabels), unreadCounts),
                role,
                features,
            ),
        [accountId, inboxes, teams, accountLabels, unreadCounts, role, features],
    );

    const asideRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isMobileSidebarOpen) return;
        const onClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (asideRef.current?.contains(target)) return;
            if (target.closest('#mobile-sidebar-launcher, [data-popover-content]')) return;
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
                isCollapsed: isEffectivelyCollapsed,
                isResizing,
                sidebarWidth,
                activePopover,
                setActivePopover,
                scheduleClose,
                cancelClose,
            }}
        >
            <aside
                ref={asideRef}
                className={[
                    'bg-n-background flex flex-col text-sm pb-px fixed top-0 ltr:left-0 rtl:right-0 h-full z-40 w-[200px] md:w-auto md:relative md:flex-shrink-0 md:ltr:translate-x-0 md:rtl:translate-x-0 ltr:border-r rtl:border-l border-n-weak',
                    isMobileSidebarOpen ? 'shadow-lg md:shadow-none' : 'ltr:-translate-x-full rtl:translate-x-full',
                    !isResizing ? 'transition-transform duration-200 ease-out md:transition-[width]' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={isMobile ? undefined : { width: `${sidebarWidth}px` }}
            >
                <section className={`grid ${isEffectivelyCollapsed ? 'mt-3 mb-6 gap-4' : 'mt-1 mb-4 gap-2'}`}>
                    <div
                        className={`flex gap-2 items-center min-w-0 ${
                            isEffectivelyCollapsed ? 'justify-center px-1' : 'px-2'
                        }`}
                    >
                        {isEffectivelyCollapsed ? (
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
                    <div className={`flex gap-2 ${isEffectivelyCollapsed ? 'flex-col items-center' : 'px-2'}`}>
                        {!isEffectivelyCollapsed ? (
                            <Link
                                href={accountScopedUrl(accountId, 'search')}
                                className="flex gap-2 items-center px-2 py-1 w-full h-7 rounded-lg outline outline-1 outline-n-weak bg-n-button-color transition-all duration-100 ease-out"
                            >
                                <span className="flex-shrink-0 i-lucide-search size-4 text-n-slate-10" />
                                <span className="flex-grow text-start text-n-slate-10">
                                    {t('COMBOBOX.SEARCH_PLACEHOLDER')}
                                </span>
                            </Link>
                        ) : (
                            <Link
                                href={accountScopedUrl(accountId, 'search')}
                                className="flex items-center justify-center size-8 rounded-lg outline outline-1 outline-n-weak bg-n-button-color transition-all duration-100 ease-out hover:bg-n-alpha-2 dark:hover:bg-n-slate-9/30"
                                title={t('COMBOBOX.SEARCH_PLACEHOLDER')}
                            >
                                <span className="i-lucide-search size-4 text-n-slate-11" />
                            </Link>
                        )}
                        <Button
                            icon="i-lucide-pen-line"
                            color="slate"
                            size="sm"
                            disabled
                            className={`dark:hover:!bg-n-slate-9/30 ${
                                isEffectivelyCollapsed
                                    ? '!size-8 !outline-n-weak !text-n-slate-11'
                                    : '!h-7 !outline-n-weak !text-n-slate-11'
                            }`}
                        />
                    </div>
                </section>
                <nav
                    className={`grid overflow-y-scroll flex-grow gap-2 pb-5 no-scrollbar min-w-0 ${
                        isEffectivelyCollapsed ? 'px-1' : 'px-2'
                    }`}
                >
                    <ul
                        className={`flex flex-col gap-1 m-0 list-none min-w-0 ${
                            isEffectivelyCollapsed ? 'items-center' : ''
                        }`}
                    >
                        {menuItems.map(item => (
                            <SidebarGroup key={item.name} accountId={accountId} {...item} />
                        ))}
                    </ul>
                </nav>
                <section className="flex relative flex-col flex-shrink-0 gap-1 justify-between items-center">
                    <div className="pointer-events-none absolute inset-x-0 -top-[1.938rem] h-8 bg-gradient-to-t from-n-background to-transparent" />
                    <div
                        className={`px-1 py-1.5 flex-shrink-0 flex w-full z-50 gap-2 items-center border-t border-n-weak shadow-[0px_-2px_4px_0px_rgba(27,28,29,0.02)] ${
                            isEffectivelyCollapsed ? 'justify-center' : 'justify-between'
                        }`}
                    >
                        <SidebarProfileMenu isCollapsed={isEffectivelyCollapsed} />
                    </div>
                </section>
                {/* Resize Handle (desktop only) */}
                <div
                    className="hidden md:block absolute top-0 h-full w-1 cursor-col-resize z-40 ltr:right-0 rtl:left-0 group"
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
            </aside>
        </SidebarContextProvider>
    );
}
