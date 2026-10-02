import { describe, expect, it } from 'vitest';

import { buildMenuItems } from 'dashboard/components-next/sidebar/menuItems';
import { filterMenuByRole } from 'dashboard/components-next/sidebar/permissions';
import type { SidebarMenuItem } from 'dashboard/components-next/sidebar/provider';

const settingsChildNames = (items: SidebarMenuItem[]) =>
    items.find(item => item.name === 'Settings')?.children?.map(child => child.name) ?? [];

describe('mục Kho sticker trong cài đặt', () => {
    it('hiện cho mọi quản trị viên', () => {
        expect(settingsChildNames(filterMenuByRole(buildMenuItems(1), 'administrator', {}))).toContain('Settings Custom Stickers');
    });

    it('không hiện cho nhân viên', () => {
        expect(settingsChildNames(filterMenuByRole(buildMenuItems(1), 'agent', {}))).not.toContain(
            'Settings Custom Stickers',
        );
    });
});
