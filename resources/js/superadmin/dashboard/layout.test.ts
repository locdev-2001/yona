import { describe, expect, it } from 'vitest';

import { defaultLayout, hiddenWidgets, hideItem, moveItem, resizeItem, showItem, visibleItems } from './layout';
import type { WidgetMeta } from './types';

const widget = (key: string, defaultSize: WidgetMeta['defaultSize'] = 'sm'): WidgetMeta => ({
    key,
    title: key,
    description: '',
    defaultSize,
    source: 'server',
});

const widgets = [widget('a', 'full'), widget('b'), widget('c', 'md')];

describe('bố cục Tổng quan', () => {
    it('mặc định theo thứ tự và kích thước của danh mục', () => {
        expect(defaultLayout(widgets)).toEqual([
            { key: 'a', size: 'full' },
            { key: 'b', size: 'sm' },
            { key: 'c', size: 'md' },
        ]);
    });

    it('bỏ ô không còn trong danh mục và tách ô đang ẩn', () => {
        const layout = [
            { key: 'c', size: 'lg' as const },
            { key: 'gone', size: 'sm' as const },
        ];

        expect(visibleItems(layout, widgets)).toEqual([{ key: 'c', size: 'lg' }]);
        expect(hiddenWidgets(layout, widgets).map(item => item.key)).toEqual(['a', 'b']);
    });

    it('đổi chỗ, đổi cỡ, ẩn và hiện lại', () => {
        const layout = defaultLayout(widgets);

        expect(moveItem(layout, 'a', 'c').map(item => item.key)).toEqual(['b', 'c', 'a']);
        expect(moveItem(layout, 'c', 'a').map(item => item.key)).toEqual(['c', 'a', 'b']);
        expect(moveItem(layout, 'a', 'missing')).toBe(layout);
        expect(resizeItem(layout, 'b', 'lg')[1]).toEqual({ key: 'b', size: 'lg' });

        const hidden = hideItem(layout, 'b');
        expect(hidden.map(item => item.key)).toEqual(['a', 'c']);
        expect(showItem(hidden, widgets[1])).toEqual([...hidden, { key: 'b', size: 'sm' }]);
        expect(showItem(layout, widgets[1])).toBe(layout);
    });
});
