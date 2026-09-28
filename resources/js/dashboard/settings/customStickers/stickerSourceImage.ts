import type { SourcePixels } from './stickerMaskRender';

// Giải mã ảnh người dùng chọn thành buffer RGBA (khung đầu) để xem trước. Ảnh lớn thu về
// cạnh dài PREVIEW_MAX_EDGE: toạ độ chỉnh ảnh đều chuẩn hoá 0..1 nên máy chủ dựng trên ảnh
// gốc vẫn khớp. Ảnh động kèm nguyên byte để worker giải mã từng khung.

export const PREVIEW_MAX_EDGE = 1024;

export interface DecodedStickerSource {
    pixels: SourcePixels;
    animated: boolean;
    bytes: ArrayBuffer;
}

const GIF_EXTENSION = 0x21;
const GIF_IMAGE = 0x2c;
const COLOR_TABLE_FLAG = 0x80;
const WEBP_ANIMATION_FLAG = 0x02;

const asciiAt = (bytes: Uint8Array, offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));

const colorTableBytes = (flags: number) => (flags & COLOR_TABLE_FLAG ? 3 * (1 << ((flags & 0x07) + 1)) : 0);

function skipGifSubBlocks(bytes: Uint8Array, offset: number): number {
    let cursor = offset;
    while (cursor < bytes.length && bytes[cursor] !== 0) cursor += bytes[cursor] + 1;

    return cursor + 1;
}

function gifHasSeveralFrames(bytes: Uint8Array): boolean {
    let offset = 13 + colorTableBytes(bytes[10]);
    let frames = 0;
    while (offset < bytes.length) {
        const block = bytes[offset];
        if (block === GIF_EXTENSION) {
            offset = skipGifSubBlocks(bytes, offset + 2);
        } else if (block === GIF_IMAGE) {
            frames += 1;
            if (frames > 1) return true;
            offset = skipGifSubBlocks(bytes, offset + 10 + colorTableBytes(bytes[offset + 9]) + 1);
        } else {
            return false;
        }
    }

    return false;
}

export function isAnimatedImageBytes(bytes: Uint8Array): boolean {
    if (bytes.length >= 13 && asciiAt(bytes, 0, 3) === 'GIF') return gifHasSeveralFrames(bytes);
    if (bytes.length >= 21 && asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP' && asciiAt(bytes, 12, 4) === 'VP8X') {
        return (bytes[20] & WEBP_ANIMATION_FLAG) !== 0;
    }

    return false;
}

export type LoadedImage = CanvasImageSource & { width: number; height: number };

export async function loadImage(file: File): Promise<LoadedImage> {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);

    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function releaseImage(image: LoadedImage): void {
    if ('close' in image && typeof image.close === 'function') image.close();
}

/** Vẽ ảnh vào canvas mới ở đúng cỡ yêu cầu (co giãn chất lượng cao). */
export function drawScaled(image: LoadedImage, width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D is not available');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    return { canvas, context };
}

export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function decodeStickerSource(file: File): Promise<DecodedStickerSource> {
    const [image, bytes] = await Promise.all([loadImage(file), file.arrayBuffer()]);
    try {
        const { width, height } = fitWithin(image.width, image.height, PREVIEW_MAX_EDGE);
        const { context } = drawScaled(image, width, height);

        return {
            pixels: { width, height, rgba: context.getImageData(0, 0, width, height).data },
            animated: isAnimatedImageBytes(new Uint8Array(bytes)),
            bytes,
        };
    } finally {
        releaseImage(image);
    }
}
