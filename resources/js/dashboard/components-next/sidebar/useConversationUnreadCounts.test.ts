import { describe, expect, it } from 'vitest';

import { buildMenuItems } from './menuItems';
import { EMPTY_UNREAD_COUNTS, normalizeUnreadCount, normalizeUnreadCounts } from './useConversationUnreadCounts';
import type { SidebarMenuItem } from './provider';

function findLeaf(items: SidebarMenuItem[], path: string[]): SidebarMenuItem | undefined {
    return path.reduce<SidebarMenuItem | undefined>(
        (current, name) =>
            (current ? current.children : items)?.find((item: SidebarMenuItem) => item.name === name),
        undefined,
    );
}

describe('normalizeUnreadCount(s)', () => {
    it('bỏ số không hợp lệ hoặc ≤ 0', () => {
        expect(normalizeUnreadCount('4')).toBe(4);
        expect(normalizeUnreadCount(0)).toBe(0);
        expect(normalizeUnreadCount(-2)).toBe(0);
        expect(normalizeUnreadCount('x')).toBe(0);
    });

    it('chỉ giữ khóa còn đếm được', () => {
        expect(normalizeUnreadCounts({ '1': 3, '2': 0, '3': '5', '4': null })).toEqual({ '1': 3, '3': 5 });
        expect(normalizeUnreadCounts(undefined)).toEqual({});
    });
});

describe('buildMenuItems badgeCount', () => {
    const teams = [{ id: 7, name: 'Sales' }];

    it('không còn mục trung tâm thông báo, mục đầu là Hội thoại', () => {
        const items = buildMenuItems(2, teams, EMPTY_UNREAD_COUNTS);

        expect(items.some(item => item.name === 'Inbox' || item.to?.endsWith('/inbox-view'))).toBe(false);
        expect(items[0].name).toBe('Conversation');
    });

    it('cờ tắt (bộ đếm rỗng) thì mọi badge = 0 như oracle', () => {
        const items = buildMenuItems(2, teams, EMPTY_UNREAD_COUNTS);

        expect(findLeaf(items, ['Conversation', 'All'])?.badgeCount).toBe(0);
        expect(findLeaf(items, ['Conversation', 'Teams', 'Sales-7'])?.badgeCount).toBe(0);
    });

    it('đổ bộ đếm tất cả hội thoại và theo id team', () => {
        const items = buildMenuItems(2, teams, {
            allCount: 12,
            inboxes: { '1': 4 },
            labels: { '5': 2 },
            teams: { '7': 9 },
        });

        expect(findLeaf(items, ['Conversation', 'All'])?.badgeCount).toBe(12);
        expect(findLeaf(items, ['Conversation', 'Teams', 'Sales-7'])?.badgeCount).toBe(9);
    });
});
