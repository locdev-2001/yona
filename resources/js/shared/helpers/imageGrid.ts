// Luật xếp nhiều ảnh của một tin thành lưới, dùng chung cho mọi bề mặt hiển thị
// hội thoại: 1 ảnh = ô đơn, 2 ảnh = 2 cột, 3 ảnh = 3 cột một hàng, 4 ảnh = lưới
// 2×2, từ 5 ảnh thì lưới 2×2 với ô cuối là "+N" đếm số ảnh không hiện.

export const IMAGE_GRID_MAX_TILES = 4;

export type ImageGridLayout = 'single' | 'pair' | 'trio' | 'quad';

export type ImageGridTile<T> =
    | { kind: 'image'; image: T; imageIndex: number }
    | { kind: 'overflow'; hiddenCount: number; firstHiddenIndex: number };

export interface ImageGridPlan<T> {
    layout: ImageGridLayout;
    columns: 1 | 2 | 3;
    tiles: ImageGridTile<T>[];
}

const LAYOUT_BY_COUNT: Record<number, ImageGridLayout> = { 0: 'single', 1: 'single', 2: 'pair', 3: 'trio' };
const COLUMNS_BY_LAYOUT: Record<ImageGridLayout, ImageGridPlan<unknown>['columns']> = {
    single: 1,
    pair: 2,
    trio: 3,
    quad: 2,
};

export function planImageGrid<T>(images: readonly T[], maxTiles = IMAGE_GRID_MAX_TILES): ImageGridPlan<T> {
    const total = images.length;
    const layout = LAYOUT_BY_COUNT[total] ?? 'quad';
    const hasOverflow = total > maxTiles;
    const shownImageCount = hasOverflow ? maxTiles - 1 : total;

    const tiles: ImageGridTile<T>[] = images
        .slice(0, shownImageCount)
        .map((image, imageIndex) => ({ kind: 'image', image, imageIndex }));

    if (hasOverflow) {
        tiles.push({ kind: 'overflow', hiddenCount: total - shownImageCount, firstHiddenIndex: shownImageCount });
    }

    return { layout, columns: COLUMNS_BY_LAYOUT[layout], tiles };
}

// Giá trị `grid-template-columns` của lưới, cùng một nguồn cho mọi bề mặt.
export const imageGridTemplateColumns = (columns: ImageGridPlan<unknown>['columns']): string =>
    Array.from({ length: columns }, () => '1fr').join(' ');
