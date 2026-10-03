import { createRequire } from 'node:module';
import path from 'node:path';

import { renderStickerImage } from 'sticker-renderer/image/sticker-image.mjs';
import { describe, expect, it } from 'vitest';

import type { StickerEdit } from './stickerEdit';
import { renderSticker, singleFrame } from './stickerMaskRender';
import type { SourcePixels } from './stickerMaskRender';

// Bản xem trước phải ra đúng pixel như renderer ở máy chủ (trước bước co về cỡ sticker): dựng cùng
// một ảnh, cùng `edit` bằng renderer thật, đặt cỡ đầu ra bằng cạnh ô vuông để bước co là giữ nguyên.

interface RawImage {
    data: Uint8Array;
    info: { width: number; height: number; channels: number };
}

interface SharpPipeline {
    png(): SharpPipeline;
    ensureAlpha(): SharpPipeline;
    raw(): SharpPipeline;
    toBuffer(): Promise<Uint8Array>;
    toBuffer(options: { resolveWithObject: true }): Promise<RawImage>;
}

type SharpFactory = (input: Uint8Array, options?: { raw: { width: number; height: number; channels: number } }) => SharpPipeline;

const rendererRoot = path.resolve(process.cwd(), 'services/sticker-renderer/package.json');
const sharp = createRequire(rendererRoot)('sharp') as SharpFactory;

const WIDTH = 60;
const HEIGHT = 90;

// Nền xám phẳng; một vật đỏ có viền chuyển màu và một vật xanh tách rời ở dưới.
function scene(): SourcePixels {
    const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const inRed = x >= 12 && x < 40 && y >= 8 && y < 36;
            const onRedEdge = inRed && (x === 12 || x === 39 || y === 8 || y === 35);
            const inBlue = Math.hypot(x - 30, y - 70) < 12;
            const color = onRedEdge ? [210, 120, 120] : inRed ? [220, 30, 30] : inBlue ? [30, 60, 200] : [200, 200, 200];
            rgba.set([...color, 255], (y * WIDTH + x) * 4);
        }
    }

    return { width: WIDTH, height: HEIGHT, rgba };
}

async function serverSquare(source: SourcePixels, edit: StickerEdit, side: number): Promise<Uint8Array> {
    const png = await sharp(Uint8Array.from(source.rgba), { raw: { width: source.width, height: source.height, channels: 4 } }).png().toBuffer();
    const { stickerWebp } = await renderStickerImage(png, edit, { size: side });
    const { data, info } = await sharp(stickerWebp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([side, side]);

    return data;
}

// Điểm trong suốt không có màu để so; điểm còn thấy phải trùng cả RGBA.
function mismatches(preview: Uint8ClampedArray, server: Uint8Array): number {
    let count = 0;
    for (let offset = 0; offset < preview.length; offset += 4) {
        const alpha = preview[offset + 3];
        if (alpha !== server[offset + 3]) count += 1;
        else if (alpha > 0 && (preview[offset] !== server[offset] || preview[offset + 1] !== server[offset + 1] || preview[offset + 2] !== server[offset + 2])) count += 1;
    }

    return count;
}

const baseEdit: StickerEdit = { crop: null, fit: 'cover', removeBackground: true, tolerance: 20, feather: 0, edits: [] };

describe('bản xem trước khớp pixel với renderer', () => {
    it.each<[string, Partial<StickerEdit>]>([
        ['cover cả ảnh', {}],
        ['cover kèm viền trắng', { strokeWidth: 0.03 }],
        ['contain viền trắng dày nhất', { fit: 'contain', strokeWidth: 0.08 }],
        ['viền sau chỉnh đũa thần và cọ', { strokeWidth: 0.01, edits: [{ op: 'wand-remove', x: 0.5, y: 0.2, tolerance: 20 }, { op: 'brush-keep', points: [[0.4, 0.3]], radius: 0.03 }] }],
        ['cover vùng lấy trong ảnh kèm đũa thần và cọ', {
            crop: { x: 0.1, y: 0.05, w: 0.7, h: 0.5 },
            edits: [
                { op: 'wand-remove', x: 0.5, y: 0.5, tolerance: 10 },
                { op: 'brush-keep', points: [[0.05, 0.05], [0.2, 0.1]], radius: 0.05 },
            ],
        }],
        ['contain cả ảnh (Vừa khung)', { fit: 'contain', crop: { x: -1 / 6, y: 0, w: 1.5, h: 1 } }],
        ['contain vùng lấy vượt biên (Tuỳ chỉnh)', { fit: 'contain', crop: { x: -0.25, y: 0.5, w: 1.2, h: 0.8 } }],
        ['giữ ảnh gốc', { fit: 'contain', removeBackground: false, crop: { x: 0, y: 0, w: 1, h: 1 } }],
    ])('%s', async (_, overrides) => {
        const source = scene();
        const edit = { ...baseEdit, ...overrides };
        const preview = renderSticker(singleFrame(source), edit);

        const server = await serverSquare(source, edit, preview.layout.side);

        const visible = preview.squareFrames[0].filter((_, index) => index % 4 === 3 && preview.squareFrames[0][index] > 0).length;
        expect(visible).toBeGreaterThan(100);
        expect(mismatches(preview.squareFrames[0], server)).toBe(0);
        // Lệch một điểm ảnh cũng phải bị bắt.
        const shifted = new Uint8ClampedArray(preview.squareFrames[0].length);
        shifted.set(preview.squareFrames[0].subarray(4), 0);
        expect(mismatches(shifted, server)).toBeGreaterThan(0);
    });
});
