import { useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';

import NotificationBell from 'dashboard/notifications/components/NotificationBell';
import { openCommandBar } from 'dashboard/commands/commandBarStore';
import { settingsHomeUrl, SETTINGS_MENU_NAME } from 'dashboard/settings/shell/settingsPages';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { buildMenuItems } from './menuItems';
import { MobileTabContent, mobileTabClassName } from './MobileTabItem';
import { filterMenuByRole } from './permissions';
import type { SidebarMenuChild, SidebarMenuItem } from './provider';

// Thanh tab dưới của điện thoại (cao 60px kể cả viền), tối đa 5 ô: Hộp thư · Bạn bè · Tìm kiếm ·
// Thông báo · Cài đặt. Tab chuyển trang lấy từ menu sidebar đã lọc quyền; Tìm kiếm mở bảng lệnh
// Ctrl+K, Thông báo mở bảng của chuông. Cài đặt mở màn Cài đặt ở danh mục (hồ sơ, trạng thái,
// trang cài đặt, đăng xuất), không nhảy thẳng vào trang cài đặt đầu tiên của nhóm.
export const MOBILE_TAB_GROUPS = ['Conversation', 'Contacts', 'Settings'] as const;

export interface MobileTab {
    name: string;
    label: string;
    icon: string;
    href: string;
    activePaths: string[];
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

export function buildMobileTabs(menuItems: SidebarMenuItem[], accountId: number): MobileTab[] {
    return MOBILE_TAB_GROUPS.flatMap(groupName => {
        const group = menuItems.find(item => item.name === groupName);
        const href = groupName === SETTINGS_MENU_NAME ? settingsHomeUrl(accountId) : group && firstHref(group);
        if (!group || !href || typeof group.icon !== 'string') return [];

        return [{ name: group.name, label: group.label, icon: group.icon, href, activePaths: [...new Set(routePaths(group))] }];
    });
}

export function isMobileTabActive(tab: MobileTab, url: string): boolean {
    const path = pathOf(url);
    return tab.activePaths.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

export default function MobileTabBar() {
    const { url, props } = usePage<DashboardPageProps>();
    const { currentAccount, currentAccountUser } = props;
    const accountId = currentAccount.id;
    const role = currentAccountUser.role;
    const features = currentAccount.features;

    const tabs = useMemo(
        () => buildMobileTabs(filterMenuByRole(buildMenuItems(accountId), role, features ?? {}), accountId),
        [accountId, role, features],
    );

    const renderLink = (tab: MobileTab) => {
        const isActive = isMobileTabActive(tab, url);
        return (
            <Link key={tab.name} href={tab.href} aria-current={isActive ? 'page' : undefined} className={mobileTabClassName(isActive)}>
                <MobileTabContent icon={tab.icon} label={tab.label} />
            </Link>
        );
    };
    const [inboxTab, friendsTab, settingsTab] = MOBILE_TAB_GROUPS.map(name => tabs.find(tab => tab.name === name));
    const searchLabel = t('SIDEBAR.GLOBAL_SEARCH');

    return (
        <nav
            aria-label={t('MOBILE_TAB_BAR.LABEL')}
            className="md:hidden flex-none grid grid-flow-col auto-cols-fr border-t border-n-weak bg-n-surface-panel pb-[env(safe-area-inset-bottom)]"
        >
            {inboxTab ? renderLink(inboxTab) : null}
            {friendsTab ? renderLink(friendsTab) : null}
            <button type="button" className={mobileTabClassName(false)} onClick={() => openCommandBar()}>
                <MobileTabContent icon="i-lucide-search" label={searchLabel} />
            </button>
            <NotificationBell
                triggerClassName="flex min-w-0"
                renderTrigger={({ isOpen, count, label }) => (
                    <button
                        type="button"
                        aria-label={label}
                        aria-haspopup="dialog"
                        aria-expanded={isOpen}
                        className={mobileTabClassName(isOpen)}
                    >
                        <MobileTabContent icon="i-lucide-bell" label={t('MOBILE_TAB_BAR.NOTIFICATIONS')} badgeCount={count} />
                    </button>
                )}
            />
            {settingsTab ? renderLink(settingsTab) : null}
        </nav>
    );
}
