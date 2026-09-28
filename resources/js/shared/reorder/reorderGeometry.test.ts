import { describe, expect, it } from 'vitest';

import { columnCount, gridInsertBefore, moveKeyBefore, passedDragThreshold, verticalInsertBefore } from './reorderGeometry';
import type { KeyedRect } from './reorderGeometry';

const cell = (key: string, left: number, top: number, width = 88, height = 88): KeyedRect => ({ key, rect: { left, top, width, height } });

// Lưới `columns` cột, ô 88px, khe 8px.
const grid = (keys: string[], columns: number) =>
    keys.map((key, index) => cell(key, (index % columns) * 96, Math.floor(index / columns) * 96));

describe('lõi hình học kéo-thả', () => {
    it('lưới một cột cho đúng điểm chèn của danh sách dọc ở mọi vị trí con trỏ trên thẻ', () => {
        const keys = ['a', 'b', 'c', 'd'];
        const cards = keys.map((key, index) => cell(key, 0, index * 72, 320, 64));

        for (const card of cards) {
            for (let offsetY = 0; offsetY < card.rect.height; offsetY += 4) {
                for (const offsetX of [1, 160, 319]) {
                    const pointer = { x: card.rect.left + offsetX, y: card.rect.top + offsetY };
                    expect(gridInsertBefore(pointer, cards)).toBe(verticalInsertBefore(pointer.y, card, keys));
                }
            }
        }
    });

    it('lưới nhiều cột: nửa trái ô chèn trước, nửa phải chèn sau, kể cả ô cuối hàng', () => {
        const cells = grid(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3);
        expect(columnCount(cells)).toBe(3);

        expect(gridInsertBefore({ x: 100, y: 40 }, cells)).toBe('b');
        expect(gridInsertBefore({ x: 180, y: 40 }, cells)).toBe('c');
        expect(gridInsertBefore({ x: 260, y: 40 }, cells)).toBe('d');
        expect(gridInsertBefore({ x: 60, y: 230 }, cells)).toBeNull();
        expect(gridInsertBefore({ x: 10, y: 140 }, cells)).toBe('d');
    });

    it('khe giữa hai ô vẫn chọn ô gần nhất', () => {
        const cells = grid(['a', 'b', 'c', 'd'], 4);
        expect(gridInsertBefore({ x: 91, y: 40 }, cells)).toBe('b');
    });

    it('dời khoá vào khe mới', () => {
        expect(moveKeyBefore(['a', 'b', 'c', 'd'], 'a', 'd')).toEqual(['b', 'c', 'a', 'd']);
        expect(moveKeyBefore(['a', 'b', 'c', 'd'], 'b', null)).toEqual(['a', 'c', 'd', 'b']);
        expect(moveKeyBefore(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
    });

    it('chưa đủ 5px thì chưa nhấc', () => {
        expect(passedDragThreshold({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(false);
        expect(passedDragThreshold({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
    });
});
