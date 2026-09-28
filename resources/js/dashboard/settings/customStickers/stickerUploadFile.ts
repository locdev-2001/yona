import { drawScaled, fitWithin, isAnimatedImageBytes, loadImage, releaseImage } from './stickerSourceImage';

// Ảnh tĩnh cỡ nào cũng nhận: trước khi gửi, ảnh có cạnh dài quá UPLOAD_MAX_EDGE hoặc
// nặng quá giới hạn của máy chủ được thu nhỏ ngay trong trình duyệt. Tham số chỉnh
// ảnh chuẩn hoá 0..1 nên thu nhỏ giữ nguyên tỉ lệ không làm lệch khung cắt hay nét
// chỉnh. Ảnh động gửi nguyên (thu nhỏ trong trình duyệt sẽ mất chuyển động).

export const UPLOAD_MAX_EDGE = 2048;
const OPAQUE_TYPE = 'image/jpeg';
const TRANSPARENT_TYPE = 'image/png';
const COMPACT_TRANSPARENT_TYPE = 'image/webp';
const LOSSY_QUALITY = 0.92;
const SHRINK_FACTOR = 0.8;
const MAX_ENCODE_ATTEMPTS = 4;
const EXTENSION_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export class StickerFileTooLargeError extends Error {
    constructor() {
        super('Sticker image is too large to upload');
        this.name = 'StickerFileTooLargeError';
    }
}

export interface StickerRaster {
    hasTransparency(): boolean;
    encode(type: string, quality?: number): Promise<Blob>;
}

export interface InspectedStickerImage {
    width: number;
    height: number;
    animated: boolean;
    rasterize(width: number, height: number): StickerRaster;
    release(): void;
}

export type StickerImageInspector = (file: File) => Promise<InspectedStickerImage>;

function canvasRaster(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): StickerRaster {
    return {
        hasTransparency: () => {
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            for (let offset = 3; offset < data.length; offset += 4) {
                if (data[offset] < 255) return true;
            }
            return false;
        },
        encode: (type, quality) =>
            new Promise((resolve, reject) =>
                canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error(`Could not encode ${type}`))), type, quality),
            ),
    };
}

export const inspectBrowserImage: StickerImageInspector = async file => {
    const [image, bytes] = await Promise.all([loadImage(file), file.arrayBuffer()]);

    return {
        width: image.width,
        height: image.height,
        animated: isAnimatedImageBytes(new Uint8Array(bytes)),
        rasterize: (width, height) => {
            const { canvas, context } = drawScaled(image, width, height);
            return canvasRaster(canvas, context);
        },
        release: () => releaseImage(image),
    };
};

/** Ảnh trong suốt: PNG giữ trọn alpha; PNG vẫn quá nặng thì thử WebP (trình duyệt không mã hoá được WebP sẽ trả PNG). */
async function encodeRaster(raster: StickerRaster, maxBytes: number): Promise<Blob> {
    if (!raster.hasTransparency()) return raster.encode(OPAQUE_TYPE, LOSSY_QUALITY);
    const png = await raster.encode(TRANSPARENT_TYPE);
    if (png.size <= maxBytes) return png;
    const webp = await raster.encode(COMPACT_TRANSPARENT_TYPE, LOSSY_QUALITY);

    return webp.type === COMPACT_TRANSPARENT_TYPE && webp.size < png.size ? webp : png;
}

function renamed(fileName: string, type: string): string {
    const baseName = fileName.replace(/\.[^.]+$/, '') || 'sticker';

    return `${baseName}.${EXTENSION_BY_TYPE[type] ?? 'png'}`;
}

/**
 * Trả tệp gửi lên được: tệp gốc nếu đã vừa, không thì bản thu nhỏ; ảnh động quá nặng
 * thì ném StickerFileTooLargeError. maxBytes <= 0 nghĩa là máy chủ chưa báo giới hạn.
 */
export async function prepareStickerUpload(
    file: File,
    maxBytes: number,
    inspect: StickerImageInspector = inspectBrowserImage,
): Promise<File> {
    const limit = maxBytes > 0 ? maxBytes : Number.POSITIVE_INFINITY;
    const image = await inspect(file);
    try {
        if (image.animated) {
            if (file.size > limit) throw new StickerFileTooLargeError();
            return file;
        }
        if (Math.max(image.width, image.height) <= UPLOAD_MAX_EDGE && file.size <= limit) return file;

        let target = fitWithin(image.width, image.height, UPLOAD_MAX_EDGE);
        for (let attempt = 0; attempt < MAX_ENCODE_ATTEMPTS; attempt++) {
            const blob = await encodeRaster(image.rasterize(target.width, target.height), limit);
            if (blob.size <= limit) return new File([blob], renamed(file.name, blob.type), { type: blob.type });
            target = fitWithin(target.width, target.height, Math.floor(Math.max(target.width, target.height) * SHRINK_FACTOR));
        }
        throw new StickerFileTooLargeError();
    } finally {
        image.release();
    }
}
