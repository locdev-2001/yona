import { applyMask, buildMask, DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';

import { cropPixelRect } from './stickerEdit';
import type { PixelRect, StickerEdit } from './stickerEdit';

// Dựng bản xem trước bằng đúng lõi xoá nền của renderer: cắt → matte → áp matte.
// Hàm thuần trên buffer RGBA để chạy được trong Web Worker lẫn luồng chính.

export interface SourcePixels {
    width: number;
    height: number;
    rgba: Uint8ClampedArray;
}

export interface RenderedCrop {
    width: number;
    height: number;
    rgba: Uint8ClampedArray;
    // Khung bao phần còn thấy được, theo điểm ảnh của vùng cắt; null khi xoá sạch.
    opaqueBounds: PixelRect | null;
}

function extractRegion(source: SourcePixels, region: PixelRect): Uint8ClampedArray {
    const output = new Uint8ClampedArray(region.width * region.height * 4);
    for (let row = 0; row < region.height; row++) {
        const start = ((region.top + row) * source.width + region.left) * 4;
        output.set(source.rgba.subarray(start, start + region.width * 4), row * region.width * 4);
    }

    return output;
}

export function opaqueBounds(rgba: Uint8ClampedArray, width: number, height: number): PixelRect | null {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (rgba[(y * width + x) * 4 + 3] === 0) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    return maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function renderStickerCrop(source: SourcePixels, edit: StickerEdit): RenderedCrop {
    const region = cropPixelRect(edit.crop, source);
    const rgba = extractRegion(source, region);
    const matte = buildMask(rgba, region.width, region.height, {
        tolerance: edit.tolerance,
        seeds: edit.removeBackground ? 'edges' : 'none',
        edits: edit.edits,
        feather: edit.feather,
    });
    applyMask(rgba, matte);

    return { width: region.width, height: region.height, rgba, opaqueBounds: opaqueBounds(rgba, region.width, region.height) };
}

/** Phần không phải nền của cả ảnh (xoá nền mặc định), để đặt khung cắt ban đầu ôm lấy nó. */
export function detectSubjectBounds(source: SourcePixels): PixelRect | null {
    const rgba = new Uint8ClampedArray(source.rgba);
    applyMask(rgba, buildMask(rgba, source.width, source.height, { tolerance: DEFAULT_TOLERANCE, seeds: 'edges' }));

    return opaqueBounds(rgba, source.width, source.height);
}
