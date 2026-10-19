import { useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../i18n';
import { buildMenuItems } from './menuItems';
import MobileSidebarLauncher from './MobileSidebarLauncher';
import type { SidebarMenuChild, SidebarMenuItem } from './provider';

// Thanh tab dưới của điện thoại (cao 60px kể cả viền): các nhóm chính như điều hướng
// máy tính, lấy thẳng từ menu sidebar. Ô cuối mở ngăn kéo (hồ sơ, đăng xuất).
export const MOBILE_TAB_GROUPS = ['Conversation'] as const;

const BADGE_LIMIT = 99;

export interface MobileTab {
    name: string;
    label: string;
    icon: string;
    href: string;
    activePaths: string[];
    badgeCount?: number;
}

function pathOf(url: string): string {
    return url.split('?')[0];
}

function firstHref(item: SidebarMenuChild): string | undefined {
    if (item.to) return item.to;
    for (const child of item.children ?? []) {
        const href = firstHref(child);
        if (href) return href;
    }
    return undefined;
}

function routePaths(item: SidebarMenuChild): string[] {
    return [
        ...(item.to ? [pathOf(item.to)] : []),
        ...(item.activeOn ?? []),
        ...(item.children ?? []).flatMap(routePaths),
    ];
}

export function buildMobileTabs(menuItems: SidebarMenuItem[]): MobileTab[] {
    return MOBILE_TAB_GROUPS.flatMap(groupName => {
        const group = menuItems.find(item => item.name === groupName);
        const href = group ? firstHref(group) : undefined;
        if (!group || !href || typeof group.icon !== 'string') return [];

        return [{ name: group.name, label: group.label, icon: group.icon, href, activePaths: [...new Set(routePaths(group))], badgeCount: group.badgeCount }];
    });
}

export function isMobileTabActive(tab: MobileTab, url: string): boolean {
    const path = pathOf(url);
    return tab.activePaths.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

interface MobileTabBarProps {
    isMobileSidebarOpen: boolean;
    onToggleSidebar: () => void;
}

export default function MobileTabBar({ isMobileSidebarOpen, onToggleSidebar }: MobileTabBarProps) {
    const { url } = usePage();
    const tabs = useMemo(() => buildMobileTabs(buildMenuItems()), []);

    return (
        <nav
            aria-label={t('MOBILE_TAB_BAR.LABEL')}
            className="md:hidden flex-none grid grid-flow-col auto-cols-fr border-t border-n-weak bg-n-surface-panel pb-[env(safe-area-inset-bottom)]"
        >
            {tabs.map(tab => {
                const isActive = isMobileTabActive(tab, url);
                const badgeCount = tab.badgeCount ?? 0;

                return (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex flex-col items-center justify-center gap-0.5 h-[59px] min-w-0 px-0.5 text-xs ${
                            isActive ? 'text-n-blue-11 font-medium' : 'text-n-slate-11'
                        }`}
                    >
                        <Icon icon={tab.icon} className="size-5 shrink-0" />
                        <span className="max-w-full truncate">{tab.label}</span>
                        {badgeCount > 0 ? (
                            <span
                                className="absolute top-1.5 start-[calc(50%+0.25rem)] grid place-content-center min-w-4 h-4 px-1 rounded-full bg-n-brand text-xxs leading-none text-white tabular-nums"
                                aria-label={t('MOBILE_TAB_BAR.UNREAD', { count: badgeCount })}
                            >
                                {badgeCount > BADGE_LIMIT ? `${BADGE_LIMIT}+` : badgeCount}
                            </span>
                        ) : null}
                    </Link>
                );
            })}
            <MobileSidebarLauncher isMobileSidebarOpen={isMobileSidebarOpen} onToggle={onToggleSidebar} />
        </nav>
    );
}
