// Một listener con trỏ cho cả trang thay vì một listener mỗi avatar: danh sách hội
// thoại có hàng chục avatar, mỗi khung hình chỉ đo lại khi con trỏ thật sự di chuyển.
export const NEAR_POINTER_RADIUS_PX = 360;

type ProximityListener = (isNear: boolean) => void;

interface WatchedElement {
    element: Element;
    onChange: ProximityListener;
    isNear: boolean;
}

const watchedElements = new Set<WatchedElement>();
let pointer: { x: number; y: number } | null = null;
let frameRequested = false;

function distanceToRect(x: number, y: number, rect: DOMRect): number {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.hypot(dx, dy);
}

function measure(): void {
    frameRequested = false;
    for (const watched of watchedElements) {
        const isNear =
            pointer !== null &&
            distanceToRect(pointer.x, pointer.y, watched.element.getBoundingClientRect()) <= NEAR_POINTER_RADIUS_PX;
        if (isNear !== watched.isNear) {
            watched.isNear = isNear;
            watched.onChange(isNear);
        }
    }
}

function scheduleMeasure(): void {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(measure);
}

function onPointerMove(event: PointerEvent): void {
    pointer = { x: event.clientX, y: event.clientY };
    scheduleMeasure();
}

function onPointerLeave(): void {
    pointer = null;
    scheduleMeasure();
}

function supportsFinePointer(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches === true;
}

/** Báo khi con trỏ vào/ra vùng gần phần tử; trả về hàm huỷ theo dõi. */
export function watchPointerProximity(element: Element, onChange: ProximityListener): () => void {
    if (!supportsFinePointer()) return () => undefined;

    const watched: WatchedElement = { element, onChange, isNear: false };
    if (watchedElements.size === 0) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
    watchedElements.add(watched);
    if (pointer) scheduleMeasure();

    return () => {
        watchedElements.delete(watched);
        if (watchedElements.size === 0) {
            window.removeEventListener('pointermove', onPointerMove);
            document.documentElement.removeEventListener('pointerleave', onPointerLeave);
        }
    };
}
