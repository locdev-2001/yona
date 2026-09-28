import { applyMask, buildMask, DEFAULT_TOLERANCE } from 'sticker-renderer/image/background-mask.mjs';
import { cropGeometry, editsInRegion, opaqueBounds, squareLayout } from 'sticker-renderer/image/sticker-geometry.mjs';
import type { SquareLayout } from 'sticker-renderer/image/sticker-geometry.mjs';

import { decodeAnimation } from './stickerAnimationDecode';
import type { PixelRect, StickerEdit } from './stickerEdit';

// Dựng bản xem trước bằng đúng lõi của renderer: lấy vùng (cropGeometry) → xoá nền từng khung
// (buildMask/applyMask, edits theo editsInRegion) → khung bao mọi khung (opaqueBounds) → đặt lên
// ô vuông (squareLayout). Hàm thuần trên buffer RGBA để chạy được trong Web Worker lẫn luồng chính.

const CHANNELS = 4;
// Cụm điểm nhỏ hơn 0,5% diện tích ảnh là vụn, không kéo khung ôm chủ thể ra.
const SPECK_AREA_RATIO = 0.005;
// Vật lớn hơn 10% diện tích ảnh là vật chính; các vật chính không cùng lọt một ô vuông trong ảnh thì chọn Vừa khung.
const LARGE_SUBJECT_AREA_RATIO = 0.1;

export interface SourcePixels {
    width: number;
    height: number;
    rgba: Uint8ClampedArray;
}

// Mọi khung cùng cỡ; ảnh tĩnh có đúng một khung.
export interface SourceFrames {
    width: number;
    height: number;
    frames: Uint8ClampedArray[];
}

export interface RenderedSticker {
    // Vùng lấy (có thể thò ra ngoài ảnh) và phần giao với ảnh, theo điểm ảnh nguồn.
    frame: PixelRect;
    region: PixelRect;
    // Từng khung của region sau khi xoá nền.
    regionFrames: Uint8ClampedArray[];
    // Khung bao phần còn thấy được của mọi khung, theo điểm ảnh của region; null khi xoá sạch.
    bounds: PixelRect | null;
    layout: SquareLayout;
    // Từng khung đặt lên ô vuông cạnh layout.side, đúng như renderer trước bước co về cỡ sticker.
    squareFrames: Uint8ClampedArray[];
}

export interface SubjectAnalysis {
    // Hợp khung bao các vật (bỏ vụn) của mọi khung; null khi không còn gì sau xoá nền.
    subject: PixelRect | null;
    // Hợp khung bao các vật chính.
    largeSubject: PixelRect | null;
    // Khung bao vật của từng khung, để vẽ đường bao chuyển động trên ảnh động.
    frameBounds: (PixelRect | null)[];
}

export const singleFrame = (pixels: SourcePixels): SourceFrames => ({ width: pixels.width, height: pixels.height, frames: [pixels.rgba] });

function extractRegion(frame: Uint8ClampedArray, frameWidth: number, region: PixelRect): Uint8ClampedArray {
    const output = new Uint8ClampedArray(region.width * region.height * CHANNELS);
    for (let row = 0; row < region.height; row++) {
        const start = ((region.top + row) * frameWidth + region.left) * CHANNELS;
        output.set(frame.subarray(start, start + region.width * CHANNELS), row * region.width * CHANNELS);
    }

    return output;
}

/** Chép cùng một phần của mọi khung vào ô vuông trong suốt theo squareLayout (như placeOnSquare của renderer). */
export function composeSquare(frames: readonly Uint8ClampedArray[], regionWidth: number, layout: SquareLayout): Uint8ClampedArray[] {
    const { side, offsetX, offsetY, source } = layout;

    return frames.map(frame => {
        const square = new Uint8ClampedArray(side * side * CHANNELS);
        for (let row = 0; row < source.height; row++) {
            const start = ((source.top + row) * regionWidth + source.left) * CHANNELS;
            square.set(frame.subarray(start, start + source.width * CHANNELS), ((offsetY + row) * side + offsetX) * CHANNELS);
        }

        return square;
    });
}

export function renderSticker(source: SourceFrames, edit: StickerEdit): RenderedSticker {
    const { frame, region } = cropGeometry(edit.crop, source.width, source.height);
    const regionEdits = editsInRegion(edit.edits, frame, region);
    const regionFrames = source.frames.map(sourceFrame => {
        const rgba = extractRegion(sourceFrame, source.width, region);
        const matte = buildMask(rgba, region.width, region.height, {
            tolerance: edit.tolerance,
            seeds: edit.removeBackground ? 'edges' : 'none',
            edits: regionEdits,
            feather: edit.feather,
        });

        return applyMask(rgba, matte);
    });
    const bounds = opaqueBounds(regionFrames, region.width, region.height);
    const layout = squareLayout(edit.fit, frame, region, bounds);

    return { frame, region, regionFrames, bounds, layout, squareFrames: composeSquare(regionFrames, region.width, layout) };
}

export const renderedBuffers = (rendered: RenderedSticker): ArrayBuffer[] =>
    [...rendered.regionFrames, ...rendered.squareFrames].map(frame => frame.buffer as ArrayBuffer);

const unionRect = (first: PixelRect | null, second: PixelRect | null): PixelRect | null => {
    if (!first) return second;
    if (!second) return first;
    const left = Math.min(first.left, second.left);
    const top = Math.min(first.top, second.top);

    return {
        left,
        top,
        width: Math.max(first.left + first.width, second.left + second.width) - left,
        height: Math.max(first.top + first.height, second.top + second.height) - top,
    };
};

interface Component {
    area: number;
    bounds: PixelRect;
}

/** Các cụm điểm còn thấy được nối nhau theo 8 hướng. */
function visibleComponents(rgba: Uint8ClampedArray, width: number, height: number): Component[] {
    const labels = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    const components: Component[] = [];
    for (let start = 0; start < labels.length; start++) {
        if (labels[start] || rgba[start * CHANNELS + 3] === 0) continue;
        labels[start] = 1;
        let size = 0;
        stack[size++] = start;
        let area = 0;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        while (size > 0) {
            const index = stack[--size];
            const x = index % width;
            const y = (index - x) / width;
            area += 1;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width || (dx === 0 && dy === 0)) continue;
                    const neighbour = ny * width + nx;
                    if (labels[neighbour] || rgba[neighbour * CHANNELS + 3] === 0) continue;
                    labels[neighbour] = 1;
                    stack[size++] = neighbour;
                }
            }
        }
        components.push({ area, bounds: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 } });
    }

    return components;
}

/** Xoá nền mặc định từng khung rồi tìm vật: bỏ cụm vụn, gộp khung bao qua mọi khung (ảnh động không bị cắt khung sau). */
export function analyzeSubject(source: SourceFrames): SubjectAnalysis {
    const { width, height } = source;
    const imageArea = width * height;
    let subject: PixelRect | null = null;
    let largeSubject: PixelRect | null = null;
    const frameBounds = source.frames.map(sourceFrame => {
        const rgba = new Uint8ClampedArray(sourceFrame);
        applyMask(rgba, buildMask(rgba, width, height, { tolerance: DEFAULT_TOLERANCE, seeds: 'edges' }));
        const components = visibleComponents(rgba, width, height);
        const kept = components.filter(component => component.area >= imageArea * SPECK_AREA_RATIO);
        const counted = kept.length > 0 ? kept : components;
        const bounds = counted.reduce<PixelRect | null>((union, component) => unionRect(union, component.bounds), null);
        subject = unionRect(subject, bounds);
        kept
            .filter(component => component.area >= imageArea * LARGE_SUBJECT_AREA_RATIO)
            .forEach(component => {
                largeSubject = unionRect(largeSubject, component.bounds);
            });

        return bounds;
    });

    return { subject, largeSubject, frameBounds };
}

export type StickerSourceInput =
    | { kind: 'still'; pixels: SourcePixels }
    | { kind: 'animation'; bytes: ArrayBuffer; type: string; firstFrame: SourcePixels };

export interface LoadedStickerSource {
    width: number;
    height: number;
    // Khung đầu ở đúng cỡ đang dựng, để vẽ ảnh gốc trên vùng làm việc.
    firstFrame: Uint8ClampedArray;
    // Độ trễ (ms) từng khung xem trước; rỗng khi chỉ có một khung.
    delays: number[];
    // Nguồn là ảnh động nhưng trình duyệt không giải mã được từng khung.
    animationUnavailable: boolean;
    subject: SubjectAnalysis;
}

export async function loadSourceFrames(input: StickerSourceInput): Promise<{ frames: SourceFrames; loaded: LoadedStickerSource }> {
    const animation = input.kind === 'animation' ? await decodeAnimation(input.bytes, input.type).catch(() => null) : null;
    const frames: SourceFrames = animation ?? singleFrame(input.kind === 'still' ? input.pixels : input.firstFrame);
    const loaded: LoadedStickerSource = {
        width: frames.width,
        height: frames.height,
        firstFrame: new Uint8ClampedArray(frames.frames[0]),
        delays: animation && animation.frames.length > 1 ? animation.delays : [],
        animationUnavailable: input.kind === 'animation' && !animation,
        subject: analyzeSubject(frames),
    };

    return { frames, loaded };
}
