import { usePage } from '@inertiajs/react';

import type { ConsoleNavChild, ConsoleNavGroup, ConsoleNavItem, SuperAdminPageProps } from '../types';

// Icon theo `key` mục điều hướng; class phải viết nguyên văn để Tailwind sinh ra.
const NAV_ICONS: Record<string, string> = {
    dashboard: 'i-lucide-layout-dashboard',
    accounts: 'i-lucide-building-2',
    users: 'i-lucide-users',
    channel_health: 'i-lucide-activity',
    instance_status: 'i-lucide-server',
    data: 'i-lucide-database',
    sticker_packs: 'i-lucide-smile',
    agent_bots: 'i-lucide-bot',
    platform_apps: 'i-lucide-blocks',
    access_tokens: 'i-lucide-key-round',
    app_config: 'i-lucide-sliders-horizontal',
    installation_configs: 'i-lucide-file-cog',
    settings: 'i-lucide-settings',
    audit_logs: 'i-lucide-scroll-text',
    impersonations: 'i-lucide-venetian-mask',
    horizon: 'i-lucide-layers',
    pulse: 'i-lucide-gauge',
    logs: 'i-lucide-file-text',
    dash: 'i-lucide-kanban',
};

export function navIcon(key: string): string {
    return NAV_ICONS[key] ?? 'i-lucide-circle';
}

export function isItemActive(item: ConsoleNavItem, currentPath: string): boolean {
    if (item.external) return false;
    if (item.exact) return currentPath === item.url;

    return currentPath === item.url || currentPath.startsWith(`${item.url}/`);
}

// Mục con khớp cả query (`/admin/app_config?config=email`); không có query thì là mục đầu.
export function isChildActive(item: ConsoleNavItem, child: ConsoleNavChild, currentUrl: string): boolean {
    if (currentUrl === child.url) return true;

    return currentUrl === item.url && item.children?.[0]?.key === child.key;
}

export function findActiveItem(
    groups: ConsoleNavGroup[],
    currentPath: string,
): { group: ConsoleNavGroup; item: ConsoleNavItem } | null {
    for (const group of groups) {
        const item = group.items.find(candidate => isItemActive(candidate, currentPath));
        if (item) return { group, item };
    }

    return null;
}

export function useConsoleNavigation(): {
    groups: ConsoleNavGroup[];
    currentPath: string;
    currentUrl: string;
} {
    const superAdmin = usePage<SuperAdminPageProps>().props.superAdmin;
    const currentPath = superAdmin?.currentPath ?? '';

    return {
        groups: superAdmin?.navGroups ?? [],
        currentPath,
        currentUrl: superAdmin?.currentUrl ?? currentPath,
    };
}

// Nhãn tiếng Việt của một trang theo đường dẫn (vd. tiêu đề bảng CRUD chung).
export function useNavLabel(url: string, fallback: string): string {
    const { groups } = useConsoleNavigation();
    for (const group of groups) {
        const item = group.items.find(candidate => candidate.url === url);
        if (item) return item.label;
    }

    return fallback;
}

// Chuẩn hoá để tìm không dấu: "suc khoe" khớp "Sức khoẻ".
export function normalizeSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}
