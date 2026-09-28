import { parentPort, workerData } from 'node:worker_threads';
import { RenderError } from './render-error.mjs';
import { renderSticker } from './sticker-renderer.mjs';

const inputBytes = Buffer.from(workerData.inputBytes.buffer, workerData.inputBytes.byteOffset, workerData.inputBytes.byteLength);

try {
    parentPort.postMessage({ rendered: await renderSticker(inputBytes, workerData.staticSize) });
} catch (error) {
    const code = error instanceof RenderError ? error.code : 'render_failed';
    parentPort.postMessage({ errorCode: code, errorDetail: String(error?.stack ?? error) });
}
