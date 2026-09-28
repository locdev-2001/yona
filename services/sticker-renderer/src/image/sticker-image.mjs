import sharp from 'sharp';
import { applyMask, buildMask } from './background-mask.mjs';
import { RenderError } from '../render-error.mjs';
import { containAreaRatio, cropGeometry, editsInRegion, opaqueBounds, squareLayout } from './sticker-geometry.mjs';

export const MAX_INPUT_PIXELS = 25_000_000;
export const MAX_FRAMES = 200;
export const MAX_DURATION_MS = 10_000;
const SUPPORTED_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif']);
const WORKING_EDGE = 1024;
const MAX_WORKING_PIXELS_TOTAL = 16 * 1024 * 1024;
const DEFAULT_FRAME_DELAY_MS = 100;
const MIN_FRAME_DELAY_MS = 20;
const STATIC_WEBP_EFFORT = 6;
const ANIMATED_WEBP_QUALITY = 85;
const ANIMATED_WEBP_EFFORT = 4;
const CHANNELS = 4;
// GIF chỉ có trong suốt 1 bit: điểm đục từ nửa trở lên giữ, còn lại trong suốt.
const GIF_ALPHA_THRESHOLD = 128;
const GIF_EFFORT = 7;

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

/**
 * Giải mã về RGBA sao cho mỗi khung (hoặc ô vuông contain, nếu lớn hơn ảnh) ≤ WORKING_EDGE² điểm
 * và tổng mọi khung ≤ MAX_WORKING_PIXELS_TOTAL.
 */
async function decodeFrames(inputBytes, source, areaRatio) {
    const perFrameBudget = Math.min(WORKING_EDGE * WORKING_EDGE, Math.floor(MAX_WORKING_PIXELS_TOTAL / source.frameCount));
    const scale = Math.min(1, Math.sqrt(perFrameBudget / (source.width * source.frameHeight * areaRatio)));
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

/** Chép cùng một phần của mọi khung vào ô vuông trong suốt theo squareLayout. */
function placeOnSquare(frames, regionWidth, layout) {
    const { side, offsetX, offsetY, source } = layout;
    const frameBytes = side * side * CHANNELS;
    const strip = Buffer.alloc(frameBytes * frames.length);
    frames.forEach((frame, frameIndex) => {
        for (let row = 0; row < source.height; row++) {
            const sourceStart = ((source.top + row) * regionWidth + source.left) * CHANNELS;
            const targetStart = frameIndex * frameBytes + ((offsetY + row) * side + offsetX) * CHANNELS;
            strip.set(frame.subarray(sourceStart, sourceStart + source.width * CHANNELS), targetStart);
        }
    });

    return strip;
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
 * sticker.webp: tĩnh thì lossless (ở 64px nặng ngang lossy, giữ đúng màu, điểm trong suốt giữ RGB 0); động thì lossy,
 * nhẹ bằng khoảng một nửa lossless (bộ mã hoá ảnh động không giữ RGB dưới vùng trong suốt dù chọn kiểu nào).
 * static.png gửi kênh ngoài: co thẳng từ khung đầu ở cỡ riêng (kênh ngoài phóng to ảnh quá nhỏ làm vỡ hình), PNG đủ màu
 * vì bảng 256 màu làm răng cưa viền.
 */
/** Ngưỡng alpha về 0/255 tại chỗ; điểm trong suốt RGB 0 để bảng màu không tốn ô cho màu ẩn. */
function thresholdAlpha(rgba) {
    for (let offset = 0; offset < rgba.length; offset += CHANNELS) {
        if (rgba[offset + 3] >= GIF_ALPHA_THRESHOLD) {
            rgba[offset + 3] = 255;
        } else {
            rgba.fill(0, offset, offset + CHANNELS);
        }
    }

    return rgba;
}

async function encodeOutputs(strip, side, frameCount, delays, { size, staticSize }) {
    const resized = await resizeFrames(strip, side, frameCount, size);
    const animated = frameCount > 1;
    const stickerWebp = animated
        ? await sharp(resized, { raw: { width: size, height: size * frameCount, channels: CHANNELS, pageHeight: size } })
            .webp({ quality: ANIMATED_WEBP_QUALITY, alphaQuality: 100, smartSubsample: true, effort: ANIMATED_WEBP_EFFORT, loop: 0, delay: delays })
            .toBuffer()
        : await sharp(resized, { raw: { width: size, height: size, channels: CHANNELS } })
            .webp({ lossless: true, effort: STATIC_WEBP_EFFORT })
            .toBuffer();
    const outboundFrames = await resizeFrames(strip, side, frameCount, staticSize);
    const staticPng = await sharp(outboundFrames.subarray(0, staticSize * staticSize * CHANNELS), { raw: { width: staticSize, height: staticSize, channels: CHANNELS } })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
    const outboundGif = await sharp(thresholdAlpha(Buffer.from(outboundFrames)), {
        raw: { width: staticSize, height: staticSize * frameCount, channels: CHANNELS, ...(animated ? { pageHeight: staticSize } : {}) },
    })
        .gif({ effort: GIF_EFFORT, ...(animated ? { loop: 0, delay: delays } : {}) })
        .toBuffer();

    return { stickerWebp, staticPng, outboundGif };
}

/**
 * Dựng sticker từ ảnh: giải mã (mọi khung) → lấy vùng (phần vượt biên là trong suốt) → xoá nền từng khung (edits chung)
 * → đặt lên ô vuông theo `fit` → co về size. Trả buffer sticker.webp (động nếu nguồn nhiều khung, cạnh `size`),
 * static.png (khung đầu, cạnh `staticSize`), sticker.gif (cạnh `staticSize`, động như nguồn, trong suốt 1 bit — kênh
 * ngoài nhận GIF như ảnh động giữ đúng cỡ thay vì phóng to như ảnh chụp) và thông số.
 */
export async function renderStickerImage(inputBytes, edit, { size, staticSize = size }) {
    const source = await readMetadata(inputBytes);
    const decoded = await decodeFrames(inputBytes, source, containAreaRatio(edit.fit, edit.crop, source.width, source.frameHeight));
    const { frame, region } = cropGeometry(edit.crop, decoded.width, decoded.height);
    const regionEdits = editsInRegion(edit.edits, frame, region);
    const warnings = [];
    let autoRemovedTotal = null;

    const frames = decoded.frames.map((decodedFrame) => {
        const cropped = extractRegion(decodedFrame, decoded.width, region);
        const matte = buildMask(cropped, region.width, region.height, {
            tolerance: edit.tolerance,
            seeds: edit.removeBackground ? 'edges' : 'none',
            edits: regionEdits,
            feather: edit.feather,
        });
        if (matte.autoRemoved !== null) autoRemovedTotal = (autoRemovedTotal ?? 0) + matte.autoRemoved;

        return applyMask(cropped, matte);
    });

    const bounds = opaqueBounds(frames, region.width, region.height);
    if (!bounds) warnings.push('mask_empty');
    if (autoRemovedTotal === 0) warnings.push('mask_full');

    const layout = squareLayout(edit.fit, frame, region, bounds);
    const strip = placeOnSquare(frames, region.width, layout);
    const { stickerWebp, staticPng, outboundGif } = await encodeOutputs(strip, layout.side, frames.length, source.delays, { size, staticSize });

    return {
        stickerWebp,
        staticPng,
        outboundGif,
        details: { width: size, height: size, staticSize, frames: frames.length, durationMs: source.durationMs, warnings },
    };
}
