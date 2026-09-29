import { describe, expect, it } from 'vitest';

import { conversationSidebarItemsOrder } from './useUISettings';

const names = (items: { name: string }[]) => items.map(item => item.name);

describe('thứ tự mục panel phải', () => {
    it('mặc định đưa "Ảnh, tệp, link" lên ngay sau khối hành động', () => {
        expect(names(conversationSidebarItemsOrder({})).slice(0, 3)).toEqual([
            'conversation_actions',
            'shared_files',
            'previous_conversation',
        ]);
    });

    it('giữ nguyên thứ tự người dùng đã tự sắp, mục mới nối vào cuối', () => {
        const savedOrder = [{ name: 'contact_notes' }, { name: 'conversation_actions' }, { name: 'shared_files' }];
        const order = names(conversationSidebarItemsOrder({ conversation_sidebar_items_order: savedOrder }));

        expect(order.slice(0, 3)).toEqual(['contact_notes', 'conversation_actions', 'shared_files']);
        expect(order).toContain('previous_conversation');
        expect(new Set(order).size).toBe(order.length);
    });
});
