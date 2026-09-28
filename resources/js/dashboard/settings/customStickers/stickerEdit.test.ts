import { describe, expect, it } from 'vitest';

import {
    brushPointCount,
    canAddStickerEdit,
    cropPixelRect,
    defaultCrop,
    MAX_BRUSH_STROKE_POINTS,
    MAX_STICKER_EDITS,
    MAX_TOTAL_BRUSH_POINTS,
    moveCrop,
    resizeCrop,
    toStickerEdit,
} from './stickerEdit';
import type { SourceEdit, StickerDraft } from './stickerEdit';

const SIZE = { width: 400, height: 200 };

const draft = (overrides: Partial<StickerDraft> = {}): StickerDraft => ({
    crop: { left: 100, top: 0, side: 200 },
    removeBackground: true,
    tolerance: 20,
    edits: [],
    ...overrides,
});

describe('khung cắt vuông', () => {
    it('mặc định ôm vật, chừa lề, nằm trong ảnh', () => {
        const crop = defaultCrop({ left: 180, top: 60, width: 40, height: 80 }, SIZE);

        expect(crop.side).toBeGreaterThan(80);
        expect(Math.abs(crop.left + crop.side / 2 - 200)).toBeLessThanOrEqual(1);
        expect(crop.top).toBeGreaterThanOrEqual(0);
        expect(crop.top + crop.side).toBeLessThanOrEqual(SIZE.height);
    });

    it('không tìm thấy vật thì lấy hình vuông lớn nhất ở giữa', () => {
        expect(defaultCrop(null, SIZE)).toEqual({ left: 100, top: 0, side: 200 });
    });

    it('kéo khung không ra ngoài ảnh', () => {
        expect(moveCrop({ left: 150, top: 0, side: 100 }, 500, -50, SIZE)).toEqual({ left: 300, top: 0, side: 100 });
    });

    it('kéo góc dưới phải thì góc trên trái đứng yên, cạnh không vượt mép ảnh', () => {
        expect(resizeCrop({ left: 100, top: 20, side: 50 }, 'se', 400, 60, SIZE)).toEqual({ left: 100, top: 20, side: 180 });
    });

    it('kéo góc trên trái thu nhỏ quanh góc dưới phải', () => {
        expect(resizeCrop({ left: 100, top: 20, side: 100 }, 'nw', 170, 90, SIZE)).toEqual({ left: 170, top: 90, side: 30 });
    });

    it('toạ độ chuẩn hoá của khung cắt dựng lại đúng vùng điểm ảnh', () => {
        const edit = toStickerEdit(draft({ crop: { left: 37, top: 11, side: 123 } }), SIZE);

        expect(edit.crop!.x + edit.crop!.w).toBeLessThanOrEqual(1);
        expect(cropPixelRect(edit.crop, SIZE)).toMatchObject({ left: 37, top: 11 });
    });
});

describe('toStickerEdit', () => {
    it('đổi toạ độ ảnh gốc sang toạ độ vùng cắt, bỏ nét đũa thần nằm ngoài khung', () => {
        const edit = toStickerEdit(
            draft({
                edits: [
                    { op: 'wand-remove', x: 0.5, y: 0.25, tolerance: 30 },
                    { op: 'wand-keep', x: 0.1, y: 0.5, tolerance: 20 },
                ],
            }),
            SIZE,
        );

        expect(edit).toEqual({
            crop: { x: 0.25, y: 0, w: 0.5, h: 1 },
            removeBackground: true,
            tolerance: 20,
            feather: 0,
            edits: [{ op: 'wand-remove', x: 0.5, y: 0.25, tolerance: 30 }],
        });
    });

    it('bán kính cọ tính lại theo cạnh vùng cắt, nét đi ra ngoài khung bị cắt tại mép', () => {
        const edit = toStickerEdit(
            draft({
                edits: [{ op: 'brush-keep', points: [[0.5, 0.5], [0.625, 0.5], [0.9, 0.5]], radius: 0.025 }],
            }),
            SIZE,
        );

        expect(edit.edits).toEqual([{ op: 'brush-keep', points: [[0.5, 0.5], [0.75, 0.5], [1, 0.5]], radius: 0.05 }]);
    });

    it('nét cọ đi ra rồi vào lại khung thành hai nét', () => {
        const edit = toStickerEdit(
            draft({
                edits: [{ op: 'brush-remove', points: [[0.5, 0.1], [0.9, 0.1], [0.9, 0.9], [0.5, 0.9]], radius: 0.01 }],
            }),
            SIZE,
        );

        expect(edit.edits).toHaveLength(2);
        expect(edit.edits.every(operation => 'points' in operation && operation.points.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1))).toBe(true);
    });

    it('nét cọ nằm trọn trong khung giữ nguyên là một nét', () => {
        const points: [number, number][] = Array.from({ length: 50 }, (_, index) => [0.3 + index * 0.007, 0.3 + index * 0.009]);
        const edit = toStickerEdit(draft({ edits: [{ op: 'brush-remove', points, radius: 0.01 }] }), SIZE);

        expect(edit.edits).toHaveLength(1);
        expect(edit.edits[0]).toMatchObject({ op: 'brush-remove' });
        expect('points' in edit.edits[0] && edit.edits[0].points).toHaveLength(50);
    });
});

describe('JSON edit gửi lên luôn dưới 1 MB', () => {
    const SERVER_EDIT_LIMIT_BYTES = 1024 * 1024;

    it('bỏ điểm cọ quá sát nhau, giữ điểm đầu và cuối, toạ độ 4 chữ số thập phân', () => {
        const points: [number, number][] = [
            [0.5, 0.5],
            [0.5001, 0.5],
            [0.50123456, 0.5],
            [0.55, 0.5],
            [0.5501, 0.5],
        ];
        const edit = toStickerEdit(draft({ edits: [{ op: 'brush-remove', points, radius: 0.01 }] }), SIZE);

        expect(edit.edits).toEqual([{ op: 'brush-remove', points: [[0.5, 0.5], [0.6, 0.5], [0.6002, 0.5]], radius: 0.02 }]);
    });

    it('một phiên chỉnh rất nặng vẫn ra JSON dưới 1 MB và trong giới hạn số nét, số điểm', () => {
        // Kín giới hạn lượt chỉnh bằng nét cọ zig-zag dài, mỗi điểm cách nhau đủ xa để không bị lược.
        const edits: SourceEdit[] = Array.from({ length: MAX_STICKER_EDITS }, (_, strokeIndex) => ({
            op: strokeIndex % 2 ? 'brush-keep' : 'brush-remove',
            radius: 0.0123456,
            points: Array.from({ length: MAX_BRUSH_STROKE_POINTS }, (_, pointIndex): [number, number] => [
                0.25 + ((pointIndex * 0.0137 + strokeIndex * 0.001) % 0.5),
                (pointIndex % 2 ? 0.1 : 0.9) - strokeIndex * 0.0001,
            ]),
        }));
        const edit = toStickerEdit(draft({ edits }), SIZE);
        const json = JSON.stringify(edit);

        expect(new TextEncoder().encode(json).length).toBeLessThan(SERVER_EDIT_LIMIT_BYTES);
        expect(edit.edits.length).toBeLessThanOrEqual(MAX_STICKER_EDITS);
        expect(edit.edits.every(operation => !('points' in operation) || operation.points.length <= MAX_BRUSH_STROKE_POINTS)).toBe(true);
        expect(brushPointCount(edit)).toBe(MAX_TOTAL_BRUSH_POINTS);
        expect(canAddStickerEdit(edit)).toBe(false);
    });

    it('còn chỗ thì cho chỉnh tiếp', () => {
        const edit = toStickerEdit(draft({ edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 20 }] }), SIZE);

        expect(canAddStickerEdit(edit)).toBe(true);
    });
});
