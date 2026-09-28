import type { SourcePixels } from './stickerMaskRender';

// Vẽ buffer RGBA lên canvas cho trình chỉnh sticker. Môi trường không có Canvas 2D
// (test) thì các hàm trả null / không vẽ gì.

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

/** Co ô vuông đã dựng (đúng bản renderer trước bước co cỡ) về cạnh của `target`. */
export function drawSquareScaled(target: HTMLCanvasElement, square: HTMLCanvasElement | null): void {
    const context = target.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, target.width, target.height);
    if (!square) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(square, 0, 0, target.width, target.height);
}
