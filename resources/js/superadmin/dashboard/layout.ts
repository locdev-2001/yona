import type { LayoutItem, WidgetMeta, WidgetSize } from './types';

// Lưới 12 cột chia widget theo tỉ lệ 1/3, 1/2, 2/3 và toàn dòng.
export const GRID_CLASS = 'dashboard-bento-grid';

// Ngoài chế độ tuỳ chỉnh, ô nhỏ phía sau được kéo lên lấp chỗ trống của hàng trên (bố cục đã lưu
// có thể để thủng lưới). Lúc kéo thả thì giữ đúng thứ tự để vị trí thả khớp với điều người dùng thấy.
export const GRID_DENSE_CLASS = 'grid-flow-row-dense';

export const SIZE_CLASS: Record<WidgetSize, string> = {
    sm: 'col-span-1 xl:col-span-4',
    md: 'col-span-1 md:col-span-2 xl:col-span-6',
    lg: 'col-span-1 md:col-span-2 xl:col-span-8',
    full: 'col-span-1 md:col-span-2 xl:col-span-12',
};

export function defaultLayout(widgets: WidgetMeta[]): LayoutItem[] {
    return widgets.map(widget => ({ key: widget.key, size: widget.defaultSize }));
}

// Bỏ ô không còn trong danh mục; layout lưu từ trước vẫn dùng được khi thêm/bớt ô.
export function visibleItems(layout: LayoutItem[], widgets: WidgetMeta[]): LayoutItem[] {
    const known = new Set(widgets.map(widget => widget.key));

    return layout.filter(item => known.has(item.key));
}

export function hiddenWidgets(layout: LayoutItem[], widgets: WidgetMeta[]): WidgetMeta[] {
    const shown = new Set(layout.map(item => item.key));

    return widgets.filter(widget => !shown.has(widget.key));
}

export function moveItem(layout: LayoutItem[], fromKey: string, toKey: string): LayoutItem[] {
    const from = layout.findIndex(item => item.key === fromKey);
    const to = layout.findIndex(item => item.key === toKey);
    if (from < 0 || to < 0 || from === to) return layout;

    const next = [...layout];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    return next;
}

export function resizeItem(layout: LayoutItem[], key: string, size: WidgetSize): LayoutItem[] {
    return layout.map(item => (item.key === key ? { ...item, size } : item));
}

export function hideItem(layout: LayoutItem[], key: string): LayoutItem[] {
    return layout.filter(item => item.key !== key);
}

export function showItem(layout: LayoutItem[], widget: WidgetMeta): LayoutItem[] {
    if (layout.some(item => item.key === widget.key)) return layout;

    return [...layout, { key: widget.key, size: widget.defaultSize }];
}
