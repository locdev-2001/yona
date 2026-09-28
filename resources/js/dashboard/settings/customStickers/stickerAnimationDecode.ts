import type { SourceFrames } from './stickerMaskRender';

// Giải mã từng khung ảnh động (GIF/WebP động) bằng ImageDecoder để xem trước chạy thật và để khung
// ôm chủ thể tính trên mọi khung. Trình duyệt thiếu ImageDecoder hoặc OffscreenCanvas thì trả null,
// trình chỉnh lùi về xem khung đầu với vùng lấy Vừa khung.

export const MAX_PREVIEW_FRAMES = 60;
const MAX_FRAME_EDGE = 1024;
// Tổng điểm ảnh mọi khung giữ trong bộ nhớ worker (~32 MB RGBA).
const TOTAL_PIXEL_BUDGET = 8 * 1024 * 1024;
const MIN_FRAME_DELAY_MS = 20;
const DEFAULT_FRAME_DELAY_MS = 100;
const MICROSECONDS_PER_MS = 1000;

export interface DecodedAnimation extends SourceFrames {
    // Độ trễ (ms) của từng khung lấy mẫu, đã gộp thời lượng các khung bị bỏ qua.
    delays: number[];
    totalFrames: number;
}

/** Như renderer: độ trễ dưới 20ms trình duyệt coi là 100ms. */
export const normalizeFrameDelay = (delayMs: number | null | undefined) =>
    delayMs !== null && delayMs !== undefined && Number.isFinite(delayMs) && delayMs >= MIN_FRAME_DELAY_MS ? Math.round(delayMs) : DEFAULT_FRAME_DELAY_MS;

/** Chọn tối đa `max` khung trải đều, luôn giữ khung đầu. */
export function sampleFrameIndices(total: number, max = MAX_PREVIEW_FRAMES): number[] {
    if (total <= max) return Array.from({ length: total }, (_, index) => index);

    return Array.from({ length: max }, (_, index) => Math.floor((index * total) / max));
}

/** Cỡ mỗi khung để mọi khung lấy mẫu cùng nằm trong ngân sách bộ nhớ. */
export function animationFrameSize(width: number, height: number, frameCount: number): { width: number; height: number } {
    const perFrame = Math.min(MAX_FRAME_EDGE * MAX_FRAME_EDGE, Math.floor(TOTAL_PIXEL_BUDGET / Math.max(1, frameCount)));
    const scale = Math.min(1, Math.sqrt(perFrame / (width * height)));

    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export const canDecodeAnimation = () => typeof ImageDecoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined';

export async function decodeAnimation(bytes: ArrayBuffer, type: string): Promise<DecodedAnimation | null> {
    if (!canDecodeAnimation() || !(await ImageDecoder.isTypeSupported(type))) return null;
    const decoder = new ImageDecoder({ data: bytes, type });
    try {
        await decoder.tracks.ready;
        await decoder.completed;
        const track = decoder.tracks.selectedTrack;
        const totalFrames = track?.frameCount ?? 0;
        if (totalFrames < 1) return null;
        const indices = sampleFrameIndices(totalFrames);
        const frames: Uint8ClampedArray[] = [];
        const delays: number[] = [];
        let size: { width: number; height: number } | null = null;
        let context: OffscreenCanvasRenderingContext2D | null = null;

        for (const [position, frameIndex] of indices.entries()) {
            const { image } = await decoder.decode({ frameIndex });
            try {
                if (!size || !context) {
                    size = animationFrameSize(image.displayWidth, image.displayHeight, indices.length);
                    context = new OffscreenCanvas(size.width, size.height).getContext('2d', { willReadFrequently: true });
                    if (!context) return null;
                    context.imageSmoothingEnabled = true;
                    context.imageSmoothingQuality = 'high';
                }
                context.clearRect(0, 0, size.width, size.height);
                context.drawImage(image, 0, 0, size.width, size.height);
                frames.push(context.getImageData(0, 0, size.width, size.height).data);
                const span = (indices[position + 1] ?? totalFrames) - frameIndex;
                delays.push(normalizeFrameDelay((image.duration ?? 0) / MICROSECONDS_PER_MS) * span);
            } finally {
                image.close();
            }
        }

        return size ? { width: size.width, height: size.height, frames, delays, totalFrames } : null;
    } finally {
        decoder.close();
    }
}
