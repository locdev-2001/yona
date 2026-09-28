import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { pixelsToCanvas } from './stickerCanvas';
import type { PixelRect, StickerEdit } from './stickerEdit';
import type { RenderedSticker } from './stickerMaskRender';
import type { StickerMaskRunner } from './stickerMaskRunner';

export interface StickerPreview {
    edit: StickerEdit;
    frame: PixelRect;
    region: PixelRect;
    // Vùng lấy đã xoá nền, từng khung (vẽ trên vùng làm việc).
    regionCanvases: (HTMLCanvasElement | null)[];
    // Ô vuông đúng như renderer trước bước co cỡ, từng khung (vẽ ô xem trước).
    squareCanvases: (HTMLCanvasElement | null)[];
    isEmpty: boolean;
}

export interface StickerPreviewState {
    preview: StickerPreview | null;
    isRendering: boolean;
    hasFailed: boolean;
}

function toPreview(edit: StickerEdit, rendered: RenderedSticker): StickerPreview {
    const { region, layout } = rendered;

    return {
        edit,
        frame: rendered.frame,
        region,
        regionCanvases: rendered.regionFrames.map(rgba => pixelsToCanvas({ width: region.width, height: region.height, rgba })),
        squareCanvases: rendered.squareFrames.map(rgba => pixelsToCanvas({ width: layout.side, height: layout.side, rgba })),
        isEmpty: rendered.bounds === null,
    };
}

// Mỗi lần `edit` đổi thì dựng lại bản xem trước; đang dựng dở thì chỉ giữ lượt mới nhất để kéo
// thanh hay tô cọ liên tục không dồn hàng đợi.
export function useStickerPreview(runner: StickerMaskRunner, edit: StickerEdit): StickerPreviewState {
    const [state, setState] = useState<StickerPreviewState>({ preview: null, isRendering: true, hasFailed: false });
    const latestEditRef = useRef(edit);
    const isRenderingRef = useRef(false);
    const isMountedRef = useRef(true);
    latestEditRef.current = edit;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (isRenderingRef.current) {
            setState(current => (current.isRendering ? current : { ...current, isRendering: true }));
            return;
        }

        const renderLatest = () => {
            const target = latestEditRef.current;
            isRenderingRef.current = true;
            setState(current => ({ ...current, isRendering: true }));
            runner
                .render(target)
                .then(
                    rendered => {
                        if (!isMountedRef.current) return;
                        const isLatest = latestEditRef.current === target;
                        setState({ preview: toPreview(target, rendered), isRendering: !isLatest, hasFailed: false });
                    },
                    () => {
                        if (isMountedRef.current) setState(current => ({ ...current, isRendering: false, hasFailed: true }));
                    },
                )
                .finally(() => {
                    isRenderingRef.current = false;
                    if (isMountedRef.current && latestEditRef.current !== target) renderLatest();
                });
        };

        renderLatest();
    }, [runner, edit]);

    return state;
}

// Chạy khung ảnh động theo đúng độ trễ từng khung; một khung thì đứng yên.
export function useFramePlayback(delays: readonly number[]) {
    const frameCount = Math.max(1, delays.length);
    const [frameIndex, setFrameIndex] = useState(0);
    const [isPlaying, setPlaying] = useState(frameCount > 1);

    useEffect(() => {
        if (!isPlaying || frameCount < 2) return undefined;
        const timer = window.setTimeout(() => setFrameIndex(index => (index + 1) % frameCount), delays[frameIndex] ?? 100);

        return () => window.clearTimeout(timer);
    }, [isPlaying, frameIndex, frameCount, delays]);

    return { frameIndex: frameIndex % frameCount, frameCount, isPlaying, togglePlaying: () => setPlaying(playing => !playing) };
}

export function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize(current => (current.width === width && current.height === height ? current : { width, height }));
        });
        observer.observe(element);

        return () => observer.disconnect();
    }, [ref]);

    return size;
}
