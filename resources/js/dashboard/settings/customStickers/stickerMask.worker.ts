import { loadSourceFrames, renderedBuffers, renderSticker } from './stickerMaskRender';
import type { SourceFrames } from './stickerMaskRender';
import type { StickerMaskRequest, StickerMaskResponse } from './stickerMaskRunner';

// Web Worker của trình chỉnh sticker: giữ mọi khung của ảnh nguồn, dựng bản xem trước theo từng `edit`.

interface MaskWorkerScope {
    onmessage: ((event: MessageEvent<StickerMaskRequest>) => void) | null;
    postMessage(message: StickerMaskResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as MaskWorkerScope;
let source: SourceFrames | null = null;

scope.onmessage = async ({ data: request }) => {
    try {
        if (request.type === 'load') {
            const { frames, loaded } = await loadSourceFrames(request.input);
            source = frames;
            scope.postMessage({ id: request.id, type: 'loaded', loaded }, [loaded.firstFrame.buffer as ArrayBuffer]);
            return;
        }
        if (!source) throw new Error('Sticker source image is not loaded');
        const result = renderSticker(source, request.edit);
        scope.postMessage({ id: request.id, type: 'rendered', result }, renderedBuffers(result));
    } catch (error) {
        scope.postMessage({ id: request.id, type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
};
