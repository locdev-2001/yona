import sharp from 'sharp';
import { choosePosterFrame, decodeLottie } from './lottie-document.mjs';
import { createLottieRasterizer } from './thorvg-engine.mjs';

const POSTER_SIZE = 256;
const POSTER_WEBP_OPTIONS = { quality: 80, alphaQuality: 100, effort: 4 };
const STATIC_PNG_OPTIONS = { compressionLevel: 9, adaptiveFiltering: true };
const RGBA_CHANNELS = 4;

function rawRgba(pixels, size) {
    return sharp(pixels, { raw: { width: size, height: size, channels: RGBA_CHANNELS } });
}

export async function renderSticker(inputBytes, staticSize) {
    const { json, document } = decodeLottie(inputBytes);
    const { frame, warnings } = choosePosterFrame(document);
    const rasterizer = await createLottieRasterizer(json);
    const timelineFrame = frame - document.ip;

    const posterPixels = rasterizer.rasterize(timelineFrame, POSTER_SIZE);
    const staticPixels = rasterizer.rasterize(timelineFrame, staticSize);
    const [posterWebp, staticPng] = await Promise.all([
        rawRgba(posterPixels, POSTER_SIZE).webp(POSTER_WEBP_OPTIONS).toBuffer(),
        rawRgba(staticPixels, staticSize).png(STATIC_PNG_OPTIONS).toBuffer(),
    ]);

    return {
        posterWebp,
        staticPng,
        details: {
            frame,
            width: document.w,
            height: document.h,
            staticSize,
            frames: rasterizer.totalFrames,
            duration: rasterizer.durationSeconds,
            warnings,
        },
    };
}
