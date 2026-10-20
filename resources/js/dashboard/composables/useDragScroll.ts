import { useCallback, useRef } from 'react';

// Kéo quá ngưỡng này mới tính là kéo cuộn, ngắn hơn vẫn là bấm.
const DRAG_THRESHOLD_PX = 4;

/**
 * Hàng cuộn ngang ẩn thanh cuộn (chip, thẻ): trên điện thoại vuốt được sẵn, máy tính thì
 * không. Hook này cho kéo bằng chuột và lăn chuột dọc để cuộn ngang; kéo xong thì nuốt
 * cú bấm ngay sau đó để không chọn nhầm chip. Trả về callback ref gắn vào phần tử cuộn.
 */
export function useDragScroll<T extends HTMLElement>(): (element: T | null) => void {
    const cleanupRef = useRef<(() => void) | null>(null);

    return useCallback((element: T | null) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        if (!element) return;

        let startX = 0;
        let startScroll = 0;
        let isPressed = false;
        let hasDragged = false;

        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            isPressed = true;
            hasDragged = false;
            startX = event.clientX;
            startScroll = element.scrollLeft;
        };
        const onPointerMove = (event: PointerEvent) => {
            if (!isPressed) return;
            const distance = event.clientX - startX;
            if (!hasDragged && Math.abs(distance) < DRAG_THRESHOLD_PX) return;
            if (!hasDragged) element.setPointerCapture(event.pointerId);
            hasDragged = true;
            element.scrollLeft = startScroll - distance;
        };
        const onPointerUp = () => {
            isPressed = false;
        };
        const onClickCapture = (event: MouseEvent) => {
            if (!hasDragged) return;
            event.preventDefault();
            event.stopPropagation();
            hasDragged = false;
        };
        const onWheel = (event: WheelEvent) => {
            const canScroll = element.scrollWidth > element.clientWidth;
            if (!canScroll || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            element.scrollLeft += event.deltaY;
        };

        element.addEventListener('pointerdown', onPointerDown);
        element.addEventListener('pointermove', onPointerMove);
        element.addEventListener('pointerup', onPointerUp);
        element.addEventListener('pointercancel', onPointerUp);
        element.addEventListener('click', onClickCapture, true);
        element.addEventListener('wheel', onWheel, { passive: false });
        cleanupRef.current = () => {
            element.removeEventListener('pointerdown', onPointerDown);
            element.removeEventListener('pointermove', onPointerMove);
            element.removeEventListener('pointerup', onPointerUp);
            element.removeEventListener('pointercancel', onPointerUp);
            element.removeEventListener('click', onClickCapture, true);
            element.removeEventListener('wheel', onWheel);
        };
    }, []);
}
