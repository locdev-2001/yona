import { usePage } from '@inertiajs/react';

import type { ConsoleNavGroup, SuperAdminPageProps } from '../types';

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

export function useActiveConsoleNavigation() {
    const navigation = useConsoleNavigation();
    const candidates = navigation.groups.flatMap(group => group.items.map(item => ({ group, item })))
        .filter(({ item }) => !item.external && (item.exact
            ? navigation.currentPath === item.url
            : navigation.currentPath === item.url || navigation.currentPath.startsWith(`${item.url}/`)))
        .sort((first, second) => second.item.url.length - first.item.url.length);
    const active = candidates[0];
    const activeChild = active?.item.children?.find(child => child.url === navigation.currentUrl);

    return { ...navigation, group: active?.group, item: active?.item, activeId: activeChild ? `${active.item.key}:${activeChild.key}` : active?.item.key ?? '' };
}
