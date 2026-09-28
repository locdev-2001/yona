import type { PixelRect } from './stickerEdit';
import type { SourcePixels } from './stickerMaskRender';

// Vẽ buffer RGBA lên canvas cho trình chỉnh sticker. Môi trường không có Canvas 2D
// (test) thì các hàm trả null / không vẽ gì.

// Lề quanh vật khi đặt vào ô vuông, giống renderer.
const STICKER_PADDING_RATIO = 0.04;

export function pixelsToCanvas(pixels: SourcePixels): HTMLCanvasElement | null {
    if (typeof ImageData === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels.rgba), pixels.width, pixels.height), 0, 0);

    return canvas;
}

/** Như bản dựng ở máy chủ: cắt sát phần còn thấy, đặt giữa ô vuông có lề, co về cạnh `target`. */
export function drawComposedSticker(target: HTMLCanvasElement, cropCanvas: HTMLCanvasElement | null, bounds: PixelRect | null): void {
    const context = target.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, target.width, target.height);
    if (!cropCanvas || !bounds) return;

    const side = Math.max(1, Math.ceil(Math.max(bounds.width, bounds.height) * (1 + 2 * STICKER_PADDING_RATIO)));
    const scale = target.width / side;
    const offsetX = Math.floor((side - bounds.width) / 2);
    const offsetY = Math.floor((side - bounds.height) / 2);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        cropCanvas,
        bounds.left,
        bounds.top,
        bounds.width,
        bounds.height,
        offsetX * scale,
        offsetY * scale,
        bounds.width * scale,
        bounds.height * scale,
    );
}
