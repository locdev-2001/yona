// Luật xếp nhiều ảnh của một tin thành lưới, dùng chung cho mọi bề mặt hiển thị
// hội thoại: 1 ảnh = ô đơn, 2 ảnh = 2 cột, 3–4 ảnh = lưới 2×2 (ảnh thứ 3 của bộ
// 3 trải hết hàng), từ 5 ảnh thì ô cuối là "+N" đếm số ảnh không hiện.

export const IMAGE_GRID_MAX_TILES = 4;

export type ImageGridLayout = 'single' | 'pair' | 'quad';

export type ImageGridTile<T> =
    | { kind: 'image'; image: T; imageIndex: number; spansRow: boolean }
    | { kind: 'overflow'; hiddenCount: number; firstHiddenIndex: number };

export interface ImageGridPlan<T> {
    layout: ImageGridLayout;
    columns: 1 | 2;
    tiles: ImageGridTile<T>[];
}

export function planImageGrid<T>(images: readonly T[], maxTiles = IMAGE_GRID_MAX_TILES): ImageGridPlan<T> {
    const total = images.length;
    const layout: ImageGridLayout = total <= 1 ? 'single' : total === 2 ? 'pair' : 'quad';
    const hasOverflow = total > maxTiles;
    const shownImageCount = hasOverflow ? maxTiles - 1 : total;

    const tiles: ImageGridTile<T>[] = images.slice(0, shownImageCount).map((image, imageIndex) => ({
        kind: 'image',
        image,
        imageIndex,
        spansRow: total === 3 && imageIndex === 2,
    }));

    if (hasOverflow) {
        tiles.push({ kind: 'overflow', hiddenCount: total - shownImageCount, firstHiddenIndex: shownImageCount });
    }

    return { layout, columns: layout === 'single' ? 1 : 2, tiles };
}
