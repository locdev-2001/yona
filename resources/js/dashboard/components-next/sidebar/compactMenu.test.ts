import { describe, expect, it, vi } from 'vitest';

import { buildMenuItems } from './menuItems';
import { filterMenuByRole } from './permissions';
import type { SidebarMenuChild } from './provider';

const destinationUrls = (items: SidebarMenuChild[]): string[] =>
    items.flatMap(item => [...(item.to ? [item.to] : []), ...destinationUrls(item.children ?? [])]);

describe('menu tinh gọn', () => {
    it('giữ bốn nhóm chính, sticker và các cài đặt cơ bản dù bật mọi cờ nâng cao', () => {
        const visible = filterMenuByRole(buildMenuItems(2), 'administrator', {
            whatsapp_campaign: true,
            macros: true,
            help_center: true,
            agent_bots: true,
            automations: true,
        });

        expect(visible.map(item => item.name)).toEqual(['Conversation', 'Contacts', 'Reports', 'Settings']);
        const urls = destinationUrls(visible);
        expect(urls).toEqual(expect.arrayContaining([
            '/app/accounts/2/dashboard',
            '/app/accounts/2/contacts',
            '/app/accounts/2/reports/overview',
            '/app/accounts/2/settings/custom-stickers',
            '/app/accounts/2/settings/canned-response/list',
            '/app/accounts/2/settings/inboxes/list',
            '/app/accounts/2/settings/agents/list',
            '/app/accounts/2/settings/labels/list',
        ]));
        expect(urls.some(url => /campaigns|portals|macros|automation|agent-bots|integrations|custom-attributes|templates|security|data\/imports|reports\/(csat|bot|agent|label|teams|inboxes|conversation)/.test(url))).toBe(false);
        expect(visible.find(item => item.name === 'Contacts')?.children).toBeUndefined();
        expect(visible.find(item => item.name === 'Reports')?.children).toBeUndefined();
    });

    it('Hộp thư là một mục bấm thẳng, không có cây kênh hay nhãn, vẫn giữ số chưa đọc', () => {
        const unreadCounts = { allCount: 7, inboxes: {}, labels: {}, teams: {} };
        const conversationMenu = filterMenuByRole(buildMenuItems(2, [], unreadCounts), 'agent')[0];
        expect(conversationMenu.children).toBeUndefined();
        expect(conversationMenu.to).toBe('/app/accounts/2/dashboard');
        expect(conversationMenu.badgeCount).toBe(7);
    });

    it('nhân viên vẫn có sticker và câu trả lời mẫu, không thấy quản trị hoặc báo cáo', () => {
        const visible = filterMenuByRole(buildMenuItems(2), 'agent');
        const urls = destinationUrls(visible);
        expect(visible.map(item => item.name)).toEqual(['Conversation', 'Contacts', 'Settings']);
        expect(urls).toContain('/app/accounts/2/settings/custom-stickers');
        expect(urls).toContain('/app/accounts/2/settings/canned-response/list');
        expect(urls).not.toContain('/app/accounts/2/settings/agents/list');
    });

    it('khôi phục menu nâng cao khi tắt chế độ tinh gọn', async () => {
        vi.resetModules();
        vi.doMock('shared/helpers/productVisibility', () => ({
            COMPACT_INTERFACE: false,
            isProductFeatureVisible: () => true,
        }));
        try {
            const { filterMenuByRole: fullMenu } = await import('./permissions');
            const visible = fullMenu(buildMenuItems(2), 'administrator', { whatsapp_campaign: true });
            expect(destinationUrls(visible)).toContain('/app/accounts/2/campaigns/whatsapp');
            expect(destinationUrls(visible)).toContain('/app/accounts/2/settings/macros');
            expect(visible.find(item => item.name === 'Reports')?.children).toHaveLength(8);
        } finally {
            vi.doUnmock('shared/helpers/productVisibility');
            vi.resetModules();
        }
    });
});
