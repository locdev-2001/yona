import { detectSubjectBounds, renderStickerCrop } from './stickerMaskRender';
import type { RenderedCrop, SourcePixels } from './stickerMaskRender';
import type { PixelRect, StickerEdit } from './stickerEdit';

// Chạy lõi xoá nền ngoài luồng giao diện (Web Worker) để kéo dung sai hay tô cọ
// không làm đơ màn hình. Trình duyệt không có Worker, hoặc Worker không nạp được,
// thì chạy cùng hàm đó ngay trên luồng chính.

export type StickerMaskRequest =
    | { id: number; type: 'load'; source: SourcePixels }
    | { id: number; type: 'render'; edit: StickerEdit };

export type StickerMaskResponse =
    | { id: number; type: 'loaded'; subjectBounds: PixelRect | null }
    | { id: number; type: 'rendered'; result: RenderedCrop }
    | { id: number; type: 'failed'; message: string };

export interface StickerMaskRunner {
    load(source: SourcePixels): Promise<PixelRect | null>;
    render(edit: StickerEdit): Promise<RenderedCrop>;
    dispose(): void;
}

const MISSING_SOURCE = 'Sticker source image is not loaded';

export function createInThreadMaskRunner(): StickerMaskRunner {
    let source: SourcePixels | null = null;

    return {
        load: async loaded => {
            source = loaded;
            return detectSubjectBounds(loaded);
        },
        render: async edit => {
            if (!source) throw new Error(MISSING_SOURCE);
            return renderStickerCrop(source, edit);
        },
        dispose: () => {
            source = null;
        },
    };
}

function spawnWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    try {
        return new Worker(new URL('./stickerMask.worker.ts', import.meta.url), { type: 'module' });
    } catch {
        return null;
    }
}

interface PendingRequest {
    settle: (response: StickerMaskResponse) => void;
    retryInThread: () => void;
}

export function createStickerMaskRunner(): StickerMaskRunner {
    const spawned = spawnWorker();
    const fallback = createInThreadMaskRunner();
    if (!spawned) return fallback;
    const worker: Worker = spawned;

    let isWorkerUsable = true;
    let loadedSource: SourcePixels | null = null;
    let nextRequestId = 0;
    const pending = new Map<number, PendingRequest>();

    const switchToFallback = () => {
        if (!isWorkerUsable) return;
        isWorkerUsable = false;
        worker.terminate();
        const stranded = [...pending.values()];
        pending.clear();
        const reloaded = loadedSource ? fallback.load(loadedSource) : Promise.resolve(null);
        void reloaded.finally(() => stranded.forEach(request => request.retryInThread()));
    };

    worker.addEventListener('message', (event: MessageEvent<StickerMaskResponse>) => {
        const request = pending.get(event.data.id);
        if (!request) return;
        pending.delete(event.data.id);
        request.settle(event.data);
    });
    worker.addEventListener('error', switchToFallback);
    worker.addEventListener('messageerror', switchToFallback);

    function send<T>(request: StickerMaskRequest, unwrap: (response: StickerMaskResponse) => T, inThread: () => Promise<T>): Promise<T> {
        if (!isWorkerUsable) return inThread();

        return new Promise<T>((resolve, reject) => {
            pending.set(request.id, {
                settle: response => {
                    if (response.type === 'failed') {
                        reject(new Error(response.message));
                        return;
                    }
                    try {
                        resolve(unwrap(response));
                    } catch (error) {
                        reject(error);
                    }
                },
                retryInThread: () => void inThread().then(resolve, reject),
            });
            worker.postMessage(request);
        });
    }

    return {
        load: source => {
            loadedSource = source;
            return send(
                { id: nextRequestId++, type: 'load', source },
                response => (response.type === 'loaded' ? response.subjectBounds : null),
                () => fallback.load(source),
            );
        },
        render: edit =>
            send(
                { id: nextRequestId++, type: 'render', edit },
                response => {
                    if (response.type !== 'rendered') throw new Error(`Unexpected ${response.type} response`);
                    return response.result;
                },
                () => fallback.render(edit),
            ),
        dispose: () => {
            pending.clear();
            loadedSource = null;
            fallback.dispose();
            if (isWorkerUsable) worker.terminate();
            isWorkerUsable = false;
        },
    };
}
