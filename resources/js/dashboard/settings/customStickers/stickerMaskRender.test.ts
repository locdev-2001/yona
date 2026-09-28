import { describe, expect, it } from 'vitest';

import type { StickerEdit } from './stickerEdit';
import { analyzeSubject, renderSticker, singleFrame } from './stickerMaskRender';
import type { SourceFrames, SourcePixels } from './stickerMaskRender';

type Rgb = [number, number, number];

const SIDE = 40;
const BACKGROUND: Rgb = [200, 200, 200];
const HALO: Rgb = [180, 180, 180];
const SUBJECT: Rgb = [220, 30, 30];

// Nền xám, một viền xám đậm hơn chút quanh vật đỏ, trong vật có một lỗ màu nền không
// nối ra mép (loang từ mép không tới được).
function stickerOnGrey(): SourcePixels {
    const rgba = new Uint8ClampedArray(SIDE * SIDE * 4);
    for (let y = 0; y < SIDE; y++) {
        for (let x = 0; x < SIDE; x++) {
            const inHalo = x >= 8 && x < 32 && y >= 8 && y < 32;
            const inSubject = x >= 10 && x < 30 && y >= 10 && y < 30;
            const inHole = x >= 18 && x < 22 && y >= 18 && y < 22;
            const color = inHole ? BACKGROUND : inSubject ? SUBJECT : inHalo ? HALO : BACKGROUND;
            rgba.set([...color, 255], (y * SIDE + x) * 4);
        }
    }

    return { width: SIDE, height: SIDE, rgba };
}

const edit = (overrides: Partial<StickerEdit> = {}): StickerEdit => ({
    crop: null,
    fit: 'cover',
    removeBackground: true,
    tolerance: 5,
    feather: 0,
    edits: [],
    ...overrides,
});

const alphaAt = (rgba: Uint8ClampedArray, x: number, y: number, width = SIDE) => rgba[(y * width + x) * 4 + 3];
const renderCrop = (source: SourcePixels, overrides: Partial<StickerEdit> = {}) => {
    const rendered = renderSticker(singleFrame(source), edit(overrides));

    return { ...rendered, rgba: rendered.regionFrames[0], width: rendered.region.width, height: rendered.region.height, opaqueBounds: rendered.bounds };
};
const transparentCount = (rgba: Uint8ClampedArray) => rgba.filter((_, index) => index % 4 === 3 && rgba[index] === 0).length;

describe('xem trước xoá nền bằng lõi của renderer', () => {
    it('nền loang từ mép thành trong suốt tuyệt đối, vật giữ nguyên', () => {
        const { rgba, opaqueBounds } = renderCrop(stickerOnGrey(), edit());

        expect(alphaAt(rgba, 0, 0)).toBe(0);
        expect(Array.from(rgba.subarray(0, 3))).toEqual([0, 0, 0]);
        expect(alphaAt(rgba, 12, 12)).toBe(255);
        expect(opaqueBounds).toEqual({ left: 8, top: 8, width: 24, height: 24 });
    });

    it('tăng dung sai thì xoá luôn viền gần giống nền', () => {
        const strict = renderCrop(stickerOnGrey(), edit({ tolerance: 5 }));
        const loose = renderCrop(stickerOnGrey(), edit({ tolerance: 20 }));

        expect(alphaAt(strict.rgba, 8, 8)).toBe(255);
        expect(alphaAt(loose.rgba, 8, 8)).toBe(0);
        expect(transparentCount(loose.rgba)).toBeGreaterThan(transparentCount(strict.rgba));
        expect(loose.opaqueBounds).toEqual({ left: 10, top: 10, width: 20, height: 20 });
    });

    it('đũa thần xoá lỗ kín trong vật mà loang từ mép không tới', () => {
        const automatic = renderCrop(stickerOnGrey(), edit());
        const withWand = renderCrop(stickerOnGrey(), edit({ edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 5 }] }));

        expect(alphaAt(automatic.rgba, 20, 20)).toBe(255);
        expect(alphaAt(withWand.rgba, 20, 20)).toBe(0);
    });

    it('cọ khôi phục lấy lại phần nền đã xoá', () => {
        const restored = renderCrop(
            stickerOnGrey(),
            edit({ edits: [{ op: 'brush-keep', points: [[0.05, 0.05]], radius: 0.05 }] }),
        );

        expect(alphaAt(restored.rgba, 2, 2)).toBe(255);
        expect(alphaAt(restored.rgba, 38, 38)).toBe(0);
    });

    it('dùng ảnh gốc thì không xoá gì, khung cắt lấy đúng vùng', () => {
        const original = renderCrop(stickerOnGrey(), edit({ removeBackground: false, crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } }));

        expect(original.width).toBe(20);
        expect(original.height).toBe(20);
        expect(transparentCount(original.rgba)).toBe(0);
        expect(Array.from(original.rgba.subarray(0, 3))).toEqual(SUBJECT);
    });

    it('cover đặt phần còn thấy vào ô vuông lề 4%; contain đặt nguyên vùng lấy theo cạnh dài', () => {
        const cover = renderCrop(stickerOnGrey(), { tolerance: 20 });
        expect(cover.layout).toEqual({ side: 22, offsetX: 1, offsetY: 1, source: { left: 10, top: 10, width: 20, height: 20 } });
        expect(alphaAt(cover.squareFrames[0], 0, 0, 22)).toBe(0);
        expect(alphaAt(cover.squareFrames[0], 1, 1, 22)).toBe(255);

        const contain = renderCrop(stickerOnGrey(), { tolerance: 20, fit: 'contain', crop: { x: -0.5, y: 0, w: 2, h: 2 } });
        expect(contain.layout.side).toBe(80);
        expect(alphaAt(contain.squareFrames[0], 20 + 10, 10, 80)).toBe(255);
        expect(alphaAt(contain.squareFrames[0], 5, 5, 80)).toBe(0);
    });
});

function framesWithDots(width: number, height: number, dots: [number, number, number][][]): SourceFrames {
    return {
        width,
        height,
        frames: dots.map(frameDots => {
            const rgba = new Uint8ClampedArray(width * height * 4);
            for (let offset = 0; offset < rgba.length; offset += 4) rgba.set([...BACKGROUND, 255], offset);
            for (const [left, top, side] of frameDots) {
                for (let y = top; y < top + side; y++) for (let x = left; x < left + side; x++) rgba.set([...SUBJECT, 255], (y * width + x) * 4);
            }
            return rgba;
        }),
    };
}

describe('tìm chủ thể để đặt vùng lấy mặc định', () => {
    it('bỏ vụn dưới 0,5% diện tích, không để vụn kéo khung ra', () => {
        const analysis = analyzeSubject(framesWithDots(100, 100, [[[40, 40, 20], [2, 2, 2]]]));

        expect(analysis.subject).toEqual({ left: 40, top: 40, width: 20, height: 20 });
    });

    it('ảnh động: hợp khung bao của mọi khung, chấm chạy ngang không bị cắt ở khung sau', () => {
        const analysis = analyzeSubject(framesWithDots(120, 60, [[[10, 20, 20]], [[50, 20, 20]], [[90, 20, 20]]]));

        expect(analysis.subject).toEqual({ left: 10, top: 20, width: 100, height: 20 });
        expect(analysis.frameBounds).toEqual([
            { left: 10, top: 20, width: 20, height: 20 },
            { left: 50, top: 20, width: 20, height: 20 },
            { left: 90, top: 20, width: 20, height: 20 },
        ]);
    });

    it('các vật chính (trên 10% diện tích) được gom riêng để biết có lọt một ô vuông không', () => {
        const analysis = analyzeSubject(framesWithDots(60, 180, [[[5, 5, 50], [5, 125, 50], [28, 90, 4]]]));

        expect(analysis.largeSubject).toEqual({ left: 5, top: 5, width: 50, height: 170 });
    });
});
