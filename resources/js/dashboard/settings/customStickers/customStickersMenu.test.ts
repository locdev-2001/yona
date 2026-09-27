import { describe, expect, it } from 'vitest';

import { buildMenuItems } from 'dashboard/components-next/sidebar/menuItems';
import { filterMenuByRole } from 'dashboard/components-next/sidebar/permissions';
import type { SidebarMenuItem } from 'dashboard/components-next/sidebar/provider';

const settingsChildNames = (items: SidebarMenuItem[]) =>
    items.find(item => item.name === 'Settings')?.children?.map(child => child.name) ?? [];

describe('mục Kho sticker trong cài đặt', () => {
    it('ẩn khi account chưa bật cờ custom_stickers', () => {
        const names = settingsChildNames(filterMenuByRole(buildMenuItems(1), 'administrator', {}));

        expect(names).toContain('Settings Payment Accounts');
        expect(names).not.toContain('Settings Custom Stickers');
    });

    it('chỉ hiện cho quản trị viên khi cờ bật', () => {
        const features = { custom_stickers: true };

        expect(settingsChildNames(filterMenuByRole(buildMenuItems(1), 'administrator', features))).toContain('Settings Custom Stickers');
        expect(settingsChildNames(filterMenuByRole(buildMenuItems(1), 'agent', features))).not.toContain('Settings Custom Stickers');
    });
});
