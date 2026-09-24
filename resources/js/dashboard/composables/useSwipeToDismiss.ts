import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent } from 'react';

// Vuốt xuống quá ngưỡng này thì đóng; ngắn hơn thì nảy về chỗ cũ.
export const SWIPE_DISMISS_DISTANCE_PX = 80;
// Vuốt ngang quá ngưỡng này thì chuyển mục (khi lớp phủ có nhiều mục).
export const SWIPE_NAVIGATE_DISTANCE_PX = 50;
// Lớp nội dung mờ dần theo quãng vuốt, không mờ quá một nửa.
const FADE_DISTANCE_PX = 400;
const MAX_FADE = 0.5;

export type SwipeDirection = 'previous' | 'next';

interface TouchPoint {
    x: number;
    y: number;
}

export interface SwipeToDismiss {
    handlers: {
        onTouchStart: (event: TouchEvent) => void;
        onTouchMove: (event: TouchEvent) => void;
        onTouchEnd: () => void;
        onTouchCancel: () => void;
    };
    style: CSSProperties | undefined;
}

/**
 * Vuốt xuống để đóng lớp phủ trên màn cảm ứng. Chỉ tính cú vuốt một ngón, hướng
 * xuống là chính; hai ngón (phóng to) để nguyên. Truyền `onSwipeHorizontal` thì
 * vuốt ngang là chuyển mục: sang trái xem mục sau, sang phải xem mục trước.
 */
export function useSwipeToDismiss(
    onDismiss: () => void,
    onSwipeHorizontal?: (direction: SwipeDirection) => void,
): SwipeToDismiss {
    const startPoint = useRef<TouchPoint | null>(null);
    const latestOffset = useRef(0);
    const latestHorizontalOffset = useRef(0);
    const [offsetY, setOffsetY] = useState(0);

    const updateOffset = useCallback((next: number) => {
        latestOffset.current = next;
        setOffsetY(next);
    }, []);

    const reset = useCallback(() => {
        startPoint.current = null;
        latestHorizontalOffset.current = 0;
        updateOffset(0);
    }, [updateOffset]);

    const onTouchStart = useCallback(
        (event: TouchEvent) => {
            if (event.touches.length !== 1) {
                reset();
                return;
            }
            const touch = event.touches[0];
            startPoint.current = { x: touch.clientX, y: touch.clientY };
        },
        [reset],
    );

    const onTouchMove = useCallback(
        (event: TouchEvent) => {
            const start = startPoint.current;
            if (!start) return;
            if (event.touches.length !== 1) {
                reset();
                return;
            }
            const touch = event.touches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            const isDownwardSwipe = deltaY > 0 && deltaY > Math.abs(deltaX);
            latestHorizontalOffset.current = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : 0;
            updateOffset(isDownwardSwipe ? deltaY : 0);
        },
        [reset, updateOffset],
    );

    const onTouchEnd = useCallback(() => {
        const hasStarted = startPoint.current !== null;
        const shouldDismiss = hasStarted && latestOffset.current >= SWIPE_DISMISS_DISTANCE_PX;
        const horizontalOffset = latestHorizontalOffset.current;
        reset();
        if (shouldDismiss) {
            onDismiss();
            return;
        }
        if (hasStarted && onSwipeHorizontal && Math.abs(horizontalOffset) >= SWIPE_NAVIGATE_DISTANCE_PX) {
            onSwipeHorizontal(horizontalOffset < 0 ? 'next' : 'previous');
        }
    }, [onDismiss, onSwipeHorizontal, reset]);

    const style: CSSProperties | undefined =
        offsetY > 0
            ? {
                  transform: `translateY(${offsetY}px)`,
                  opacity: 1 - Math.min(offsetY / FADE_DISTANCE_PX, MAX_FADE),
              }
            : undefined;

    return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset }, style };
}
