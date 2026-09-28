import { detectSubjectBounds, renderStickerCrop } from './stickerMaskRender';
import type { SourcePixels } from './stickerMaskRender';
import type { StickerMaskRequest, StickerMaskResponse } from './stickerMaskRunner';

// Web Worker của trình chỉnh sticker: giữ ảnh nguồn, dựng bản xem trước theo từng `edit`.

interface MaskWorkerScope {
    onmessage: ((event: MessageEvent<StickerMaskRequest>) => void) | null;
    postMessage(message: StickerMaskResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as MaskWorkerScope;
let source: SourcePixels | null = null;

scope.onmessage = ({ data: request }) => {
    try {
        if (request.type === 'load') {
            source = request.source;
            scope.postMessage({ id: request.id, type: 'loaded', subjectBounds: detectSubjectBounds(request.source) });
            return;
        }
        if (!source) throw new Error('Sticker source image is not loaded');
        const result = renderStickerCrop(source, request.edit);
        scope.postMessage({ id: request.id, type: 'rendered', result }, [result.rgba.buffer]);
    } catch (error) {
        scope.postMessage({ id: request.id, type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
};
