import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';

import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { ICON_ASSIGN_TEAM, ICON_BELL, ICON_MESSAGE_CIRCLE, ICON_USER_PEN, NAVIGATION_ICONS } from 'dashboard/helper/commandbar/icons';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { buildMenuItems } from 'dashboard/components-next/sidebar/menuItems';
import { filterMenuByRole } from 'dashboard/components-next/sidebar/permissions';
import type { AccountRole, SidebarMenuChild } from 'dashboard/components-next/sidebar/provider';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

// Lệnh "đi tới" sinh từ chính menu sidebar (cùng bộ lọc quyền + cờ tính năng),
// nên mục nào thêm vào sidebar tự tìm được bằng Ctrl+K. Chỉ những đích nằm ngoài
// sidebar (chuông thông báo, menu hồ sơ) mới khai ở OFF_MENU_DESTINATIONS.

const SOURCE = 'goto';

interface OffMenuDestination {
    id: string;
    title: string;
    icon: string;
    path: string;
}

const OFF_MENU_DESTINATIONS: OffMenuDestination[] = [
    { id: 'goto_my_inbox', title: 'COMMAND_BAR.COMMANDS.GO_TO_MY_INBOX', icon: ICON_BELL, path: 'inbox-view' },
    { id: 'compose_conversation', title: 'COMMAND_BAR.COMMANDS.COMPOSE_CONVERSATION', icon: ICON_MESSAGE_CIRCLE, path: 'inbox/new' },
    // Danh sách hội thoại mở hộp tạo nhóm khi thấy `?new=group` (ChatListHeader).
    { id: 'create_group', title: 'COMMAND_BAR.COMMANDS.CREATE_GROUP', icon: ICON_ASSIGN_TEAM, path: 'dashboard?new=group' },
    {
        id: 'open_profile_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_PROFILE',
        icon: ICON_USER_PEN,
        path: 'profile/settings',
    },
];

function navigationIcon(icon: SidebarMenuChild['icon']): string | undefined {
    return typeof icon === 'string' ? NAVIGATION_ICONS[icon] : undefined;
}

function collectMenuDestinations(
    items: SidebarMenuChild[],
    section: string,
    ancestorLabels: string[],
    inheritedIcon: string | undefined,
): CommandBarAction[] {
    return items.flatMap(item => {
        const icon = navigationIcon(item.icon) ?? inheritedIcon;
        const destinations: CommandBarAction[] = [];

        if (item.to) {
            const url = item.to;
            destinations.push({
                id: `goto_${item.name.toLowerCase().replace(/\s+/g, '_')}`,
                title: item.label,
                section,
                icon,
                keywords: ancestorLabels.join(' '),
                handler: () => router.visit(url),
            });
        }

        if (item.children?.length) {
            destinations.push(...collectMenuDestinations(item.children, section, [...ancestorLabels, item.label], icon));
        }

        return destinations;
    });
}

export function buildGoToActions(
    accountId: number,
    role: AccountRole,
    features: Record<string, boolean> = {},
): CommandBarAction[] {
    const menuDestinations = filterMenuByRole(buildMenuItems(accountId), role, features).flatMap(group =>
        collectMenuDestinations([group], group.label, [], undefined),
    );

    const generalSection = t('COMMAND_BAR.SECTIONS.GENERAL');
    const offMenuDestinations = OFF_MENU_DESTINATIONS.map(destination => {
        const url = accountScopedUrl(accountId, destination.path);
        return {
            id: destination.id,
            title: t(destination.title),
            section: generalSection,
            icon: destination.icon,
            handler: () => router.visit(url),
        };
    });

    return [...menuDestinations, ...offMenuDestinations];
}

export function useGoToCommandHotKeys(): void {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount?.id ?? 0;
    const role = currentAccountUser?.role ?? 'agent';
    const features = currentAccount?.features;

    useEffect(() => {
        if (!accountId) return undefined;

        setCommandBarActions(SOURCE, buildGoToActions(accountId, role, features ?? {}));
        return () => clearCommandBarActions(SOURCE);
    }, [accountId, role, features]);
}
