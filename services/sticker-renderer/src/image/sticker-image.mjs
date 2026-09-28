import sharp from 'sharp';
import { applyMask, buildMask } from './background-mask.mjs';
import { zeroTransparentPaletteColors } from './png-palette.mjs';
import { RenderError } from '../render-error.mjs';

export const MAX_INPUT_PIXELS = 25_000_000;
export const MAX_FRAMES = 200;
export const MAX_DURATION_MS = 10_000;
const SUPPORTED_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif']);
const WORKING_EDGE = 1024;
const MAX_WORKING_PIXELS_TOTAL = 16 * 1024 * 1024;
const PADDING_RATIO = 0.04;
const DEFAULT_FRAME_DELAY_MS = 100;
const MIN_FRAME_DELAY_MS = 20;
const STATIC_WEBP_EFFORT = 6;
const ANIMATED_WEBP_QUALITY = 85;
const ANIMATED_WEBP_EFFORT = 4;
const CHANNELS = 4;

async function readMetadata(inputBytes) {
    let metadata;
    try {
        metadata = await sharp(inputBytes, { animated: true, limitInputPixels: false }).metadata();
    } catch (error) {
        throw new RenderError('input_unreadable', error.message);
    }
    if (!SUPPORTED_FORMATS.has(metadata.format)) {
        throw new RenderError('unsupported_format', `Format ${metadata.format} is not supported`);
    }
    const frameCount = metadata.pages ?? 1;
    const frameHeight = metadata.pageHeight ?? metadata.height;
    if (!metadata.width || !frameHeight) throw new RenderError('input_unreadable', 'Missing image dimensions');
    if (metadata.width * frameHeight > MAX_INPUT_PIXELS) {
        throw new RenderError('input_too_large', `${metadata.width}×${frameHeight} exceeds ${MAX_INPUT_PIXELS} pixels`);
    }
    if (frameCount > MAX_FRAMES) throw new RenderError('too_many_frames', `${frameCount} frames exceeds ${MAX_FRAMES}`);

    const delays = Array.from({ length: frameCount }, (_, index) => normalizeDelay(metadata.delay?.[index]));
    const durationMs = frameCount > 1 ? delays.reduce((sum, delay) => sum + delay, 0) : 0;
    if (durationMs > MAX_DURATION_MS) throw new RenderError('input_too_large', `Animation lasts ${durationMs}ms, over ${MAX_DURATION_MS}ms`);

    return { width: metadata.width, frameHeight, frameCount, delays, durationMs };
}

/** GIF khai độ trễ < 20ms thì trình duyệt coi là 100ms; làm theo để WebP chạy đúng nhịp như GIF gốc. */
function normalizeDelay(delay) {
    return Number.isFinite(delay) && delay >= MIN_FRAME_DELAY_MS ? Math.round(delay) : DEFAULT_FRAME_DELAY_MS;
}

/** Giải mã về RGBA, co cạnh dài ≤ WORKING_EDGE và tổng điểm ảnh mọi khung ≤ MAX_WORKING_PIXELS_TOTAL. */
async function decodeFrames(inputBytes, source) {
    const perFrameBudget = Math.min(WORKING_EDGE * WORKING_EDGE, Math.floor(MAX_WORKING_PIXELS_TOTAL / source.frameCount));
    const scale = Math.min(1, Math.sqrt(perFrameBudget / (source.width * source.frameHeight)));
    const box = Math.max(1, Math.round(Math.max(source.width, source.frameHeight) * scale));
    const animated = source.frameCount > 1;

    let pipeline = sharp(inputBytes, { animated, limitInputPixels: MAX_INPUT_PIXELS * source.frameCount });
    if (!animated) pipeline = pipeline.rotate();

    try {
        const { data, info } = await pipeline
            .resize({ width: box, height: box, fit: 'inside', withoutEnlargement: true })
            .toColourspace('srgb')
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const frameHeight = animated ? (info.pageHeight ?? info.height / source.frameCount) : info.height;
        const frameBytes = info.width * frameHeight * CHANNELS;
        const frames = Array.from({ length: source.frameCount }, (_, index) =>
            new Uint8ClampedArray(data.buffer, data.byteOffset + index * frameBytes, frameBytes));

        return { width: info.width, height: frameHeight, frames };
    } catch (error) {
        throw new RenderError('input_unreadable', error.message);
    }
}

function cropRectangle(crop, width, height) {
    if (!crop) return { left: 0, top: 0, width, height };
    const left = Math.min(width - 1, Math.floor(crop.x * width));
    const top = Math.min(height - 1, Math.floor(crop.y * height));
    const right = Math.max(left + 1, Math.min(width, Math.ceil((crop.x + crop.w) * width)));
    const bottom = Math.max(top + 1, Math.min(height, Math.ceil((crop.y + crop.h) * height)));

    return { left, top, width: right - left, height: bottom - top };
}

function extractRegion(frame, frameWidth, region) {
    if (region.left === 0 && region.top === 0 && region.width === frameWidth && region.height * frameWidth * CHANNELS === frame.length) {
        return new Uint8ClampedArray(frame);
    }
    const output = new Uint8ClampedArray(region.width * region.height * CHANNELS);
    for (let row = 0; row < region.height; row++) {
        const sourceStart = ((region.top + row) * frameWidth + region.left) * CHANNELS;
        output.set(frame.subarray(sourceStart, sourceStart + region.width * CHANNELS), row * region.width * CHANNELS);
    }

    return output;
}

function opaqueBounds(frames, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (const frame of frames) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (frame[(y * width + x) * CHANNELS + 3] === 0) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    return maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Cắt theo khung bao chung mọi khung (hình động không nhảy), đặt giữa hình vuông chừa lề. */
function placeOnSquare(frames, width, bounds) {
    const side = Math.max(1, Math.ceil(Math.max(bounds.width, bounds.height) * (1 + 2 * PADDING_RATIO)));
    const offsetX = Math.floor((side - bounds.width) / 2);
    const offsetY = Math.floor((side - bounds.height) / 2);
    const frameBytes = side * side * CHANNELS;
    const strip = Buffer.alloc(frameBytes * frames.length);
    frames.forEach((frame, frameIndex) => {
        for (let row = 0; row < bounds.height; row++) {
            const sourceStart = ((bounds.top + row) * width + bounds.left) * CHANNELS;
            const targetStart = frameIndex * frameBytes + ((offsetY + row) * side + offsetX) * CHANNELS;
            strip.set(frame.subarray(sourceStart, sourceStart + bounds.width * CHANNELS), targetStart);
        }
    });

    return { strip, side };
}

function clearHiddenColors(rgba) {
    for (let offset = 0; offset < rgba.length; offset += CHANNELS) {
        if (rgba[offset + 3] === 0) rgba.fill(0, offset, offset + 3);
    }
}

/** Co từng khung riêng: co cả dải sẽ để nhân lọc trộn mép khung này sang khung kế. */
async function resizeFrames(strip, side, frameCount, size) {
    const frameBytes = side * side * CHANNELS;
    const resizedFrames = await Promise.all(Array.from({ length: frameCount }, (_, index) =>
        sharp(strip.subarray(index * frameBytes, (index + 1) * frameBytes), { raw: { width: side, height: side, channels: CHANNELS } })
            .resize(size, size, { fit: 'fill' })
            .raw()
            .toBuffer()));
    const resized = Buffer.concat(resizedFrames);
    clearHiddenColors(resized);

    return resized;
}

/**
 * Ảnh tĩnh: WebP lossless (ở 64px nặng ngang lossy, giữ đúng màu, điểm trong suốt giữ RGB 0).
 * Ảnh động: WebP lossy, nhẹ bằng khoảng một nửa lossless; bộ mã hoá ảnh động không giữ RGB dưới vùng trong suốt dù chọn kiểu nào.
 */
async function encodeOutputs(strip, side, frameCount, delays, size) {
    const resized = await resizeFrames(strip, side, frameCount, size);
    const animated = frameCount > 1;
    const stickerWebp = animated
        ? await sharp(resized, { raw: { width: size, height: size * frameCount, channels: CHANNELS, pageHeight: size } })
            .webp({ quality: ANIMATED_WEBP_QUALITY, alphaQuality: 100, smartSubsample: true, effort: ANIMATED_WEBP_EFFORT, loop: 0, delay: delays })
            .toBuffer()
        : await sharp(resized, { raw: { width: size, height: size, channels: CHANNELS } })
            .webp({ lossless: true, effort: STATIC_WEBP_EFFORT })
            .toBuffer();
    const palettePng = await sharp(resized.subarray(0, size * size * CHANNELS), { raw: { width: size, height: size, channels: CHANNELS } })
        .png({ palette: true, compressionLevel: 9, effort: 10 })
        .toBuffer();

    return { stickerWebp, staticPng: zeroTransparentPaletteColors(palettePng) };
}

/**
 * Dựng sticker từ ảnh: giải mã (mọi khung) → cắt → xoá nền từng khung (edits chung) → trim → vuông → co về size.
 * Trả buffer sticker.webp (động nếu nguồn nhiều khung), static.png (khung đầu, bảng màu) và thông số.
 */
export async function renderStickerImage(inputBytes, edit, size) {
    const source = await readMetadata(inputBytes);
    const decoded = await decodeFrames(inputBytes, source);
    const region = cropRectangle(edit.crop, decoded.width, decoded.height);
    const warnings = [];
    let autoRemovedTotal = null;

    const frames = decoded.frames.map((frame) => {
        const cropped = extractRegion(frame, decoded.width, region);
        const matte = buildMask(cropped, region.width, region.height, {
            tolerance: edit.tolerance,
            seeds: edit.removeBackground ? 'edges' : 'none',
            edits: edit.edits,
            feather: edit.feather,
        });
        if (matte.autoRemoved !== null) autoRemovedTotal = (autoRemovedTotal ?? 0) + matte.autoRemoved;

        return applyMask(cropped, matte);
    });

    const bounds = opaqueBounds(frames, region.width, region.height);
    if (!bounds) warnings.push('mask_empty');
    if (autoRemovedTotal === 0) warnings.push('mask_full');

    const { strip, side } = placeOnSquare(frames, region.width, bounds ?? { left: 0, top: 0, width: region.width, height: region.height });
    const { stickerWebp, staticPng } = await encodeOutputs(strip, side, frames.length, source.delays, size);

    return {
        stickerWebp,
        staticPng,
        details: { width: size, height: size, frames: frames.length, durationMs: source.durationMs, warnings },
    };
}
