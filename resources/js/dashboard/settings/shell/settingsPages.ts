import { usePage } from '@inertiajs/react';

import { buildMenuItems } from 'dashboard/components-next/sidebar/menuItems';
import { filterMenuByRole } from 'dashboard/components-next/sidebar/permissions';
import type { SidebarMenuChild } from 'dashboard/components-next/sidebar/provider';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';

export const SETTINGS_MENU_NAME = 'Settings';
const SETTINGS_PATH_SEGMENTS = ['settings', 'profile/settings'];

const LAST_APP_URL_KEY = 'yona:last-app-url';

// Trang ngoài Cài đặt vừa xem, để nút ✕ của màn Cài đặt quay đúng về đó.
export function rememberAppUrl(url: string) {
    try {
        sessionStorage.setItem(LAST_APP_URL_KEY, url);
    } catch {
        // Trình duyệt chặn lưu trữ: ✕ về hộp thư mặc định.
    }
}

export function readLastAppUrl(): string | null {
    try {
        return sessionStorage.getItem(LAST_APP_URL_KEY);
    } catch {
        return null;
    }
}

export const settingsHomeUrl = (accountId: number) => accountScopedUrl(accountId, 'profile/settings');

export function isSettingsPath(accountId: number, url: string): boolean {
    const path = url.split('?')[0];
    return SETTINGS_PATH_SEGMENTS.some(segment => {
        const prefix = accountScopedUrl(accountId, segment);
        return path === prefix || path.startsWith(`${prefix}/`);
    });
}

// Trang cài đặt người dùng được vào, lấy từ nhóm Settings của menu để quyền và
// mục ẩn chỉ khai một chỗ (menuItems.ts).
export function useSettingsPages(): SidebarMenuChild[] {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const settings = filterMenuByRole(
        buildMenuItems(currentAccount.id),
        currentAccountUser.role,
        currentAccount.features ?? {},
    ).find(item => item.name === SETTINGS_MENU_NAME);

    return (settings?.children ?? []).flatMap(child => child.children ?? child).filter(child => child.to);
}
