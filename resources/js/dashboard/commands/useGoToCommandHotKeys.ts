import { useEffect } from 'react';
import { router } from '@inertiajs/react';

import { ICON_USER_PEN, NAVIGATION_ICONS } from 'dashboard/helper/commandbar/icons';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { buildMenuItems, CHAT_PROFILE_PATH } from 'dashboard/components-next/sidebar/menuItems';
import type { SidebarMenuChild } from 'dashboard/components-next/sidebar/provider';
import { t } from '../../i18n';
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
    {
        id: 'open_profile_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_PROFILE',
        icon: ICON_USER_PEN,
        path: CHAT_PROFILE_PATH,
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

export function buildGoToActions(): CommandBarAction[] {
    const menuDestinations = buildMenuItems().flatMap(group =>
        collectMenuDestinations([group], group.label, [], undefined),
    );

    const generalSection = t('COMMAND_BAR.SECTIONS.GENERAL');
    const offMenuDestinations = OFF_MENU_DESTINATIONS.map(destination => {
        const url = destination.path;
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
    useEffect(() => {
        setCommandBarActions(SOURCE, buildGoToActions());
        return () => clearCommandBarActions(SOURCE);
    }, []);
}
