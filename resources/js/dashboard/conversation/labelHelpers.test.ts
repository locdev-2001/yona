import { describe, expect, it } from 'vitest';

import {
    activeLabels,
    appliedLabelsForSelection,
    inactiveLabels,
    labelsForRemoval,
    labelsOnSidebar,
    matchesLabels,
    sortLabelsByTitle,
    titlesAfterAdd,
    titlesAfterRemove,
    toggleLabelSelection,
} from './labelHelpers';
import type { AccountLabel } from './labelApi';

const label = (id: number, title: string, showOnSidebar = true): AccountLabel => ({
    id,
    title,
    description: null,
    color: '#1f93ff',
    show_on_sidebar: showOnSidebar,
});

const billing = label(1, 'billing');
const vip = label(2, 'vip');
const hidden = label(3, 'archived', false);

describe('labelHelpers — danh sách nhãn account', () => {
    it('sắp theo title tăng dần', () => {
        expect(sortLabelsByTitle([vip, billing]).map(item => item.title)).toEqual(['billing', 'vip']);
    });

    it('sidebar chỉ lấy nhãn show_on_sidebar và vẫn sắp theo title', () => {
        expect(labelsOnSidebar([vip, hidden, billing]).map(item => item.title)).toEqual(['billing', 'vip']);
    });

    it('không đụng mảng gốc khi sắp xếp', () => {
        const source = [vip, billing];
        sortLabelsByTitle(source);
        expect(source.map(item => item.title)).toEqual(['vip', 'billing']);
    });
});

describe('labelHelpers — nhãn của một hội thoại', () => {
    it('activeLabels giữ thứ tự danh sách account, không phải thứ tự đã lưu', () => {
        expect(activeLabels([billing, vip], ['vip', 'billing']).map(item => item.title)).toEqual([
            'billing',
            'vip',
        ]);
    });

    it('activeLabels bỏ nhãn đã lưu nhưng không còn trong account', () => {
        expect(activeLabels([billing], ['billing', 'deleted']).map(item => item.title)).toEqual(['billing']);
    });

    it('inactiveLabels là phần nhãn còn lại có thể thêm', () => {
        expect(inactiveLabels([billing, vip, hidden], ['vip']).map(item => item.title)).toEqual([
            'billing',
            'archived',
        ]);
    });

    it('titlesAfterAdd nối nhãn mới vào cuối danh sách đang có', () => {
        expect(titlesAfterAdd([billing], 'vip')).toEqual(['billing', 'vip']);
    });

    it('titlesAfterRemove gỡ đúng một nhãn theo title', () => {
        expect(titlesAfterRemove([billing, vip], 'billing')).toEqual(['vip']);
    });
});

describe('labelHelpers — thanh bulk', () => {
    it('toggleLabelSelection thêm rồi bỏ cùng một nhãn', () => {
        expect(toggleLabelSelection([], 'vip')).toEqual(['vip']);
        expect(toggleLabelSelection(['billing', 'vip'], 'billing')).toEqual(['vip']);
    });

    it('labelsForRemoval chỉ liệt kê nhãn đang gắn trên lựa chọn', () => {
        expect(labelsForRemoval([billing, vip], ['vip']).map(item => item.title)).toEqual(['vip']);
    });

    it('labelsForRemoval trả nguyên danh sách khi không truyền nhãn đang gắn', () => {
        expect(labelsForRemoval([billing, vip], null)).toHaveLength(2);
    });

    it('appliedLabelsForSelection hợp nhãn của mọi hội thoại đang chọn, không trùng', () => {
        const conversations = [
            { id: 1, labels: ['billing', 'vip'] },
            { id: 2, labels: ['vip'] },
            { id: 3, labels: ['archived'] },
        ];

        expect(appliedLabelsForSelection(conversations, [1, 2])).toEqual(['billing', 'vip']);
    });

    it('appliedLabelsForSelection bỏ qua id không có trong danh sách', () => {
        expect(appliedLabelsForSelection([{ id: 1, labels: ['vip'] }], [1, 99])).toEqual(['vip']);
    });
});

describe('labelHelpers — lọc danh sách theo nhãn', () => {
    it('hội thoại phải mang đủ mọi nhãn đang lọc', () => {
        expect(matchesLabels(['billing', 'vip'], ['vip'])).toBe(true);
        expect(matchesLabels(['billing'], ['billing', 'vip'])).toBe(false);
    });

    it('không lọc gì khi danh sách nhãn rỗng', () => {
        expect(matchesLabels(undefined, [])).toBe(true);
    });
});
