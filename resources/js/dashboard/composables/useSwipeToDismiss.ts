import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, TouchEvent } from 'react';

// Vuốt xuống quá ngưỡng này thì đóng; ngắn hơn thì nảy về chỗ cũ.
export const SWIPE_DISMISS_DISTANCE_PX = 80;
// Lớp nội dung mờ dần theo quãng vuốt, không mờ quá một nửa.
const FADE_DISTANCE_PX = 400;
const MAX_FADE = 0.5;

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
 * xuống là chính; vuốt ngang hay hai ngón (phóng to) để nguyên cho thao tác khác.
 */
export function useSwipeToDismiss(onDismiss: () => void): SwipeToDismiss {
    const startPoint = useRef<TouchPoint | null>(null);
    const latestOffset = useRef(0);
    const [offsetY, setOffsetY] = useState(0);

    const updateOffset = useCallback((next: number) => {
        latestOffset.current = next;
        setOffsetY(next);
    }, []);

    const reset = useCallback(() => {
        startPoint.current = null;
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
            updateOffset(isDownwardSwipe ? deltaY : 0);
        },
        [reset, updateOffset],
    );

    const onTouchEnd = useCallback(() => {
        const shouldDismiss = startPoint.current !== null && latestOffset.current >= SWIPE_DISMISS_DISTANCE_PX;
        reset();
        if (shouldDismiss) onDismiss();
    }, [onDismiss, reset]);

    const style: CSSProperties | undefined =
        offsetY > 0
            ? {
                  transform: `translateY(${offsetY}px)`,
                  opacity: 1 - Math.min(offsetY / FADE_DISTANCE_PX, MAX_FADE),
              }
            : undefined;

    return { handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset }, style };
}
