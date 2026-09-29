import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

// WebP/GIF động giải mã từng khung trên luồng chính: một khung chat hay khay nhiều
// sticker động cùng chạy là CPU leo. Chỉ vài sticker đang trong khung nhìn được chạy
// (sticker vào khung nhìn trước giữ lượt, không nhảy lượt khi cuộn); phần còn lại, và
// mọi sticker khi người dùng bật giảm chuyển động, hiện ảnh tĩnh.
export const MAX_ANIMATED_STICKERS = 6;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type SlotListener = (mayAnimate: boolean) => void;

const listeners = new Map<Element, SlotListener>();
const visibleInArrivalOrder = new Set<Element>();
let animating = new Set<Element>();
let observer: IntersectionObserver | null = null;
let reducedMotion: MediaQueryList | null = null;

function prefersReducedMotion(): boolean {
    return reducedMotion?.matches ?? false;
}

function redistribute(): void {
    const next = new Set(prefersReducedMotion() ? [] : [...visibleInArrivalOrder].slice(0, MAX_ANIMATED_STICKERS));

    listeners.forEach((listener, element) => {
        if (next.has(element) !== animating.has(element)) listener(next.has(element));
    });
    animating = next;
}

function onVisibilityChange(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
        if (!listeners.has(entry.target)) continue;
        if (entry.isIntersecting) visibleInArrivalOrder.add(entry.target);
        else visibleInArrivalOrder.delete(entry.target);
    }
    redistribute();
}

function startWatching(): void {
    if (typeof window.matchMedia === 'function') {
        reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
        reducedMotion.addEventListener?.('change', redistribute);
    }
    if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(onVisibilityChange);
    }
}

function stopWatching(): void {
    reducedMotion?.removeEventListener?.('change', redistribute);
    reducedMotion = null;
    observer?.disconnect();
    observer = null;
}

function claimAnimationSlot(element: Element, listener: SlotListener): () => void {
    if (listeners.size === 0) startWatching();
    listeners.set(element, listener);

    if (observer) {
        observer.observe(element);
    } else {
        // Không có IntersectionObserver thì coi như đang hiện; hạn mức vẫn áp.
        visibleInArrivalOrder.add(element);
        redistribute();
    }

    return () => {
        observer?.unobserve(element);
        listeners.delete(element);
        visibleInArrivalOrder.delete(element);
        animating.delete(element);
        if (listeners.size === 0) stopWatching();
        else redistribute();
    };
}

// false cho tới khi sticker được cấp lượt chạy, nên sticker ngoài khung nhìn không tải ảnh động.
export function useStickerAnimationSlot(elementRef: RefObject<Element | null>, isAnimated: boolean): boolean {
    const [mayAnimate, setMayAnimate] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!isAnimated || !element) return undefined;

        const releaseSlot = claimAnimationSlot(element, setMayAnimate);

        return () => {
            releaseSlot();
            setMayAnimate(false);
        };
    }, [elementRef, isAnimated]);

    return mayAnimate;
}
