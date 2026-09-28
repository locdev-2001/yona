import { parentPort, workerData } from 'node:worker_threads';
import { renderStickerImage } from './image/sticker-image.mjs';
import { RenderError } from './render-error.mjs';

const inputBytes = Buffer.from(workerData.inputBytes.buffer, workerData.inputBytes.byteOffset, workerData.inputBytes.byteLength);

try {
    parentPort.postMessage({ rendered: await renderStickerImage(inputBytes, workerData.edit, workerData.size) });
} catch (error) {
    const code = error instanceof RenderError ? error.code : 'render_failed';
    parentPort.postMessage({ errorCode: code, errorDetail: String(error?.stack ?? error) });
}
