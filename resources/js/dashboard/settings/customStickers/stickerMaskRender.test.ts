import { describe, expect, it } from 'vitest';

import type { StickerEdit } from './stickerEdit';
import { detectSubjectBounds, renderStickerCrop } from './stickerMaskRender';
import type { SourcePixels } from './stickerMaskRender';

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
    removeBackground: true,
    tolerance: 5,
    feather: 0,
    edits: [],
    ...overrides,
});

const alphaAt = (rgba: Uint8ClampedArray, x: number, y: number) => rgba[(y * SIDE + x) * 4 + 3];
const transparentCount = (rgba: Uint8ClampedArray) => rgba.filter((_, index) => index % 4 === 3 && rgba[index] === 0).length;

describe('xem trước xoá nền bằng lõi của renderer', () => {
    it('nền loang từ mép thành trong suốt tuyệt đối, vật giữ nguyên', () => {
        const { rgba, opaqueBounds } = renderStickerCrop(stickerOnGrey(), edit());

        expect(alphaAt(rgba, 0, 0)).toBe(0);
        expect(Array.from(rgba.subarray(0, 3))).toEqual([0, 0, 0]);
        expect(alphaAt(rgba, 12, 12)).toBe(255);
        expect(opaqueBounds).toEqual({ left: 8, top: 8, width: 24, height: 24 });
    });

    it('tăng dung sai thì xoá luôn viền gần giống nền', () => {
        const strict = renderStickerCrop(stickerOnGrey(), edit({ tolerance: 5 }));
        const loose = renderStickerCrop(stickerOnGrey(), edit({ tolerance: 20 }));

        expect(alphaAt(strict.rgba, 8, 8)).toBe(255);
        expect(alphaAt(loose.rgba, 8, 8)).toBe(0);
        expect(transparentCount(loose.rgba)).toBeGreaterThan(transparentCount(strict.rgba));
        expect(loose.opaqueBounds).toEqual({ left: 10, top: 10, width: 20, height: 20 });
    });

    it('đũa thần xoá lỗ kín trong vật mà loang từ mép không tới', () => {
        const automatic = renderStickerCrop(stickerOnGrey(), edit());
        const withWand = renderStickerCrop(stickerOnGrey(), edit({ edits: [{ op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 5 }] }));

        expect(alphaAt(automatic.rgba, 20, 20)).toBe(255);
        expect(alphaAt(withWand.rgba, 20, 20)).toBe(0);
    });

    it('cọ khôi phục lấy lại phần nền đã xoá', () => {
        const restored = renderStickerCrop(
            stickerOnGrey(),
            edit({ edits: [{ op: 'brush-keep', points: [[0.05, 0.05]], radius: 0.05 }] }),
        );

        expect(alphaAt(restored.rgba, 2, 2)).toBe(255);
        expect(alphaAt(restored.rgba, 38, 38)).toBe(0);
    });

    it('dùng ảnh gốc thì không xoá gì, khung cắt lấy đúng vùng', () => {
        const original = renderStickerCrop(stickerOnGrey(), edit({ removeBackground: false, crop: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } }));

        expect(original.width).toBe(20);
        expect(original.height).toBe(20);
        expect(transparentCount(original.rgba)).toBe(0);
        expect(Array.from(original.rgba.subarray(0, 3))).toEqual(SUBJECT);
    });

    it('tìm phần không phải nền (dung sai mặc định) để đặt khung cắt ban đầu', () => {
        expect(detectSubjectBounds(stickerOnGrey())).toEqual({ left: 10, top: 10, width: 20, height: 20 });
    });
});
