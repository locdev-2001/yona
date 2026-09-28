import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { containAreaRatio, cropGeometry, editsInRegion, FIT_CONTAIN, FIT_COVER, opaqueBounds, squareLayout } from './sticker-geometry.mjs';

/** Công thức vùng cắt trước khi có vượt biên: vùng lấy nằm trong ảnh phải ra đúng như cũ để sticker cũ dựng lại không đổi. */
function legacyCropRectangle(crop, width, height) {
    const left = Math.min(width - 1, Math.floor(crop.x * width));
    const top = Math.min(height - 1, Math.floor(crop.y * height));
    const right = Math.max(left + 1, Math.min(width, Math.ceil((crop.x + crop.w) * width)));
    const bottom = Math.max(top + 1, Math.min(height, Math.ceil((crop.y + crop.h) * height)));

    return { left, top, width: right - left, height: bottom - top };
}

describe('cropGeometry', () => {
    test('không cắt thì frame và region là cả ảnh', () => {
        assert.deepEqual(cropGeometry(null, 300, 900), {
            frame: { left: 0, top: 0, width: 300, height: 900 },
            region: { left: 0, top: 0, width: 300, height: 900 },
        });
    });

    test('vùng lấy trong ảnh ra đúng vùng cắt cũ, frame trùng region', () => {
        const crops = [
            { x: 0, y: 0, w: 1, h: 1 },
            { x: 0.1, y: 0.05, w: 0.8, h: 0.8 },
            { x: 0.333333, y: 0.5, w: 0.666667, h: 0.5000001 },
            { x: 0.9999, y: 0.9999, w: 0.0001, h: 0.0001 },
        ];
        for (const crop of crops) {
            for (const [width, height] of [[300, 900], [1024, 768], [7, 13]]) {
                const { frame, region } = cropGeometry(crop, width, height);
                assert.deepEqual(region, legacyCropRectangle(crop, width, height), JSON.stringify({ crop, width, height }));
                assert.deepEqual(frame, region);
            }
        }
    });

    test('vùng lấy vượt biên: frame thò ra ngoài, region là phần giao với ảnh', () => {
        const { frame, region } = cropGeometry({ x: -1, y: 0, w: 3, h: 1 }, 300, 900);

        assert.deepEqual(frame, { left: -300, top: 0, width: 900, height: 900 });
        assert.deepEqual(region, { left: 0, top: 0, width: 300, height: 900 });
    });
});

describe('editsInRegion', () => {
    const frame = { left: -100, top: -100, width: 400, height: 400 };
    const region = { left: 0, top: 0, width: 200, height: 200 };

    test('frame trùng region thì giữ nguyên edits', () => {
        const edits = [{ op: 'wand-remove', x: 0.3, y: 0.3 }];
        assert.equal(editsInRegion(edits, region, { ...region }), edits);
    });

    test('đổi toạ độ và bán kính sang region, bỏ nhấp đũa thần rơi vào phần trong suốt', () => {
        const mapped = editsInRegion([
            { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 12 },
            { op: 'wand-keep', x: 0.05, y: 0.5 },
            { op: 'brush-keep', points: [[0.25, 0.25], [0.75, 0.75]], radius: 0.1 },
        ], frame, region);

        assert.deepEqual(mapped, [
            { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 12 },
            { op: 'brush-keep', points: [[0, 0], [1, 1]], radius: 0.2 },
        ]);
    });
});

describe('squareLayout', () => {
    test('cover cắt sát phần còn thấy được, chừa lề 4%', () => {
        const region = { left: 0, top: 0, width: 300, height: 900 };
        const layout = squareLayout(FIT_COVER, region, region, { left: 10, top: 20, width: 100, height: 50 });

        assert.deepEqual(layout, { side: 108, offsetX: 4, offsetY: 29, source: { left: 10, top: 20, width: 100, height: 50 } });
    });

    test('contain đặt cả vùng lấy theo cạnh dài, kể cả phần vượt biên', () => {
        const noCrop = cropGeometry(null, 300, 900);
        const overflow = cropGeometry({ x: -1, y: 0, w: 3, h: 1 }, 300, 900);
        const expected = { side: 900, offsetX: 300, offsetY: 0, source: { left: 0, top: 0, width: 300, height: 900 } };

        assert.deepEqual(squareLayout(FIT_CONTAIN, noCrop.frame, noCrop.region, null), expected);
        assert.deepEqual(squareLayout(FIT_CONTAIN, overflow.frame, overflow.region, null), expected);
    });

    test('containAreaRatio chỉ lớn hơn 1 khi ô vuông contain lớn hơn ảnh', () => {
        assert.equal(containAreaRatio(FIT_COVER, { x: -8, y: -8, w: 17, h: 17 }, 100, 100), 1);
        assert.equal(containAreaRatio(FIT_CONTAIN, null, 300, 900), 3);
        assert.equal(containAreaRatio(FIT_CONTAIN, { x: 0, y: 0, w: 0.5, h: 0.5 }, 100, 100), 1);
        assert.equal(containAreaRatio(FIT_CONTAIN, { x: -1, y: -1, w: 3, h: 3 }, 100, 100), 9);
    });
});

describe('opaqueBounds', () => {
    test('là hợp khung bao của mọi khung', () => {
        const width = 4;
        const frameAt = (x, y) => {
            const frame = new Uint8ClampedArray(width * width * 4);
            frame[(y * width + x) * 4 + 3] = 255;
            return frame;
        };

        assert.deepEqual(opaqueBounds([frameAt(0, 1), frameAt(3, 2)], width, width), { left: 0, top: 1, width: 4, height: 2 });
        assert.equal(opaqueBounds([new Uint8ClampedArray(64)], width, width), null);
    });
});
