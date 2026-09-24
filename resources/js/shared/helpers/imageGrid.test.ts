import { describe, expect, it } from 'vitest';

import { planImageGrid } from './imageGrid';

const images = (count: number) => Array.from({ length: count }, (_, index) => `anh-${index + 1}`);

describe('planImageGrid', () => {
    it('một ảnh là ô đơn một cột', () => {
        const plan = planImageGrid(images(1));

        expect(plan.layout).toBe('single');
        expect(plan.columns).toBe(1);
        expect(plan.tiles).toHaveLength(1);
    });

    it('hai ảnh chia hai cột', () => {
        const plan = planImageGrid(images(2));

        expect(plan.layout).toBe('pair');
        expect(plan.columns).toBe(2);
        expect(plan.tiles.every(tile => tile.kind === 'image' && !tile.spansRow)).toBe(true);
    });

    it('ba ảnh xếp 2×2, ảnh thứ ba trải hết hàng', () => {
        const plan = planImageGrid(images(3));

        expect(plan.layout).toBe('quad');
        expect(plan.tiles.map(tile => tile.kind === 'image' && tile.spansRow)).toStrictEqual([false, false, true]);
    });

    it('bốn ảnh lấp đủ lưới 2×2, không có ô +N', () => {
        const plan = planImageGrid(images(4));

        expect(plan.tiles).toHaveLength(4);
        expect(plan.tiles.some(tile => tile.kind === 'overflow')).toBe(false);
    });

    it('từ năm ảnh: ba ô ảnh và ô cuối +N đếm số ảnh không hiện', () => {
        const plan = planImageGrid(images(6));

        expect(plan.tiles).toHaveLength(4);
        expect(plan.tiles.slice(0, 3).map(tile => (tile.kind === 'image' ? tile.image : null))).toStrictEqual([
            'anh-1',
            'anh-2',
            'anh-3',
        ]);
        expect(plan.tiles[3]).toStrictEqual({ kind: 'overflow', hiddenCount: 3, firstHiddenIndex: 3 });
    });

    it('không ảnh nào thì không ô nào', () => {
        expect(planImageGrid([]).tiles).toStrictEqual([]);
    });
});
