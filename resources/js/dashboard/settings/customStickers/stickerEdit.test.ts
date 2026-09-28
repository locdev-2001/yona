import { cropGeometry } from 'sticker-renderer/image/sticker-geometry.mjs';
import { describe, expect, it } from 'vitest';

import {
    brushPointCount,
    canAddStickerEdit,
    clampCrop,
    fitCrop,
    MAX_BRUSH_STROKE_POINTS,
    MAX_STICKER_EDITS,
    MAX_TOTAL_BRUSH_POINTS,
    maximumCropSide,
    moveCrop,
    resizeCrop,
    subjectCrop,
    toStickerEdit,
} from './stickerEdit';
import type { SourceEdit, StickerDraft } from './stickerEdit';

const SIZE = { width: 400, height: 200 };

const draft = (overrides: Partial<StickerDraft> = {}): StickerDraft => ({
    framing: 'subject',
    crop: { left: 100, top: 0, side: 200 },
    removeBackground: true,
    tolerance: 20,
    edits: [],
    ...overrides,
});

describe('vùng lấy vuông', () => {
    it('Ôm chủ thể: ôm vật, chừa lề 8%, nằm trong ảnh khi vừa', () => {
        const crop = subjectCrop({ left: 180, top: 60, width: 40, height: 80 }, SIZE);

        expect(crop.side).toBe(Math.ceil(80 * 1.16));
        expect(Math.abs(crop.left + crop.side / 2 - 200)).toBeLessThanOrEqual(1);
        expect(crop.top).toBeGreaterThanOrEqual(0);
        expect(crop.top + crop.side).toBeLessThanOrEqual(SIZE.height);
    });

    it('Ôm chủ thể: vật lớn hơn cạnh ngắn thì khung căn giữa vật, thò ra ngoài ảnh chứ không cắt vật', () => {
        const crop = subjectCrop({ left: 50, top: 10, width: 300, height: 180 }, SIZE);

        expect(crop.side).toBe(348);
        expect(crop.top).toBeLessThan(0);
        expect(crop.top + crop.side).toBeGreaterThan(SIZE.height);
    });

    it('không tìm thấy vật hoặc chọn Vừa khung: ô vuông theo cạnh dài, ảnh nằm giữa', () => {
        expect(subjectCrop(null, SIZE)).toEqual({ left: 0, top: -100, side: 400 });
        expect(fitCrop({ width: 300, height: 900 })).toEqual({ left: -300, top: 0, side: 900 });
    });

    it('kéo khung được ra ngoài ảnh nhưng vẫn phải chồng lên ảnh', () => {
        const moved = moveCrop({ left: 150, top: 0, side: 100 }, 5000, -5000, SIZE);

        expect(moved.left).toBe(SIZE.width - 10);
        expect(moved.top).toBe(10 - 100);
    });

    it('kéo góc dưới phải thì góc trên trái đứng yên, được lớn hơn cạnh ngắn của ảnh', () => {
        expect(resizeCrop({ left: 100, top: 20, side: 50 }, 'se', 400, 60, SIZE)).toEqual({ left: 100, top: 20, side: 300 });
    });

    it('kéo góc trên trái thu nhỏ quanh góc dưới phải', () => {
        expect(resizeCrop({ left: 100, top: 20, side: 100 }, 'nw', 170, 90, SIZE)).toEqual({ left: 170, top: 90, side: 30 });
    });

    it('khung không lớn quá gấp đôi cạnh dài', () => {
        expect(clampCrop({ left: -2000, top: -2000, side: 5000 }, SIZE).side).toBe(maximumCropSide(SIZE));
        expect(maximumCropSide(SIZE)).toBe(800);
    });

    it('toạ độ chuẩn hoá (kể cả vượt biên) dựng lại đúng vùng điểm ảnh bằng hình học của renderer', () => {
        const inside = toStickerEdit(draft({ crop: { left: 37, top: 11, side: 123 } }), SIZE);
        expect(cropGeometry(inside.crop, SIZE.width, SIZE.height).frame).toEqual({ left: 37, top: 11, width: 123, height: 123 });

        const overflowing = toStickerEdit(draft({ framing: 'custom', crop: { left: -30, top: -50, side: 300 } }), SIZE);
        const { frame, region } = cropGeometry(overflowing.crop, SIZE.width, SIZE.height);
        expect(frame).toEqual({ left: -30, top: -50, width: 300, height: 300 });
        expect(region).toEqual({ left: 0, top: 0, width: 270, height: 200 });
    });

    it('Ôm chủ thể gửi fit cover; Vừa khung và Tuỳ chỉnh gửi fit contain', () => {
        expect(toStickerEdit(draft(), SIZE).fit).toBe('cover');
        expect(toStickerEdit(draft({ framing: 'fit' }), SIZE).fit).toBe('contain');
        expect(toStickerEdit(draft({ framing: 'custom' }), SIZE).fit).toBe('contain');
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
            fit: 'cover',
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
