import { describe, expect, it } from 'vitest';
import type { ConversationListFilters } from '../listFilters';
import { activeFilterChips, sortLabelKey, sortValuesFor, toggledInboxIds, toggledLabels } from './listFilterOptions';

const BASE: ConversationListFilters = { inboxIds: [], labels: [], status: 'open', sortBy: 'last_activity_at_desc' };

describe('lựa chọn của bảng Lọc nhanh', () => {
    it.each([
        ['bật kênh đầu tiên', [], 5, [5]],
        ['bấm kênh đang chọn là bỏ', [5], 5, []],
        ['bấm kênh khác là thay, vì danh sách chỉ lọc một kênh', [5], 9, [9]],
    ])('%s', (_case, current, inboxId, expected) => {
        expect(toggledInboxIds(current, inboxId)).toEqual(expected);
    });

    it('nhãn bật/tắt độc lập, giữ thứ tự đã chọn', () => {
        expect(toggledLabels(['vip'], 'yona')).toEqual(['vip', 'yona']);
        expect(toggledLabels(['vip', 'yona'], 'vip')).toEqual(['yona']);
    });

    it('sắp xếp cũ ngoài ba kiểu nhanh vẫn có chip và hiện tên đầy đủ', () => {
        expect(sortValuesFor('unread')).toEqual(['last_activity_at_desc', 'waiting_since_asc', 'unread']);
        expect(sortValuesFor('created_at_asc')).toEqual(['last_activity_at_desc', 'waiting_since_asc', 'unread', 'created_at_asc']);
        expect(sortLabelKey('waiting_since_asc')).toBe('CHAT_LIST.FILTER_PANEL.SORT_ITEMS.waiting_since_asc');
        expect(sortLabelKey('created_at_asc')).toBe('CHAT_LIST.SORT_ORDER_ITEMS.created_at_asc.TEXT');
    });
});

describe('chip lọc đang bật', () => {
    it('mặc định không có chip nào, sắp xếp không thành chip', () => {
        expect(activeFilterChips({ ...BASE, sortBy: 'unread' })).toEqual([]);
    });

    it('kênh, nhãn, trạng thái khác Đang mở ra chip theo thứ tự, mỗi chip bỏ đúng phần của nó', () => {
        const chips = activeFilterChips({ ...BASE, inboxIds: [3], labels: ['vip', 'yona'], status: 'resolved' });

        expect(chips.map(chip => chip.key)).toEqual(['inbox:3', 'label:vip', 'label:yona', 'status:resolved']);
        expect(chips.map(chip => chip.removal)).toEqual([
            { inboxIds: [] },
            { labels: ['yona'] },
            { labels: ['vip'] },
            { status: 'open' },
        ]);
    });
});
