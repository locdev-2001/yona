import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import {
    AUTO_SCROLL_STEP_PX,
    autoScrollDirection,
    gridInsertBefore,
    moveKeyBefore,
    nearestScrollParent,
    passedDragThreshold,
} from 'shared/reorder/reorderGeometry';
import type { AutoScrollDirection, KeyedRect, Point } from 'shared/reorder/reorderGeometry';

export const REORDER_KEY_ATTRIBUTE = 'data-reorder-key';
export const TOUCH_LONG_PRESS_MS = 250;

interface ReorderGridOptions {
    keys: string[];
    enabled: boolean;
    // Cảm ứng chỉ kéo được trong chế độ Sắp xếp để không tranh cử chỉ cuộn.
    touchEnabled: boolean;
    onCommit: (orderedKeys: string[]) => void;
}

export interface ReorderIndicator {
    left: number;
    top: number;
    height: number;
}

export interface ReorderGhost {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Press {
    key: string;
    start: Point;
    grab: Point;
    width: number;
    height: number;
    pointerType: string;
    armed: boolean;
}

const DRAG_BLOCKING_TARGETS = 'button, a, input, textarea, [data-no-drag]';

// Kéo-thả trên lưới ô: điểm chèn theo tâm ô gần nhất (lõi chung với DraggableReorderList),
// thả xong trả thứ tự mới một lần qua onCommit.
export function useReorderGrid({ keys, enabled, touchEnabled, onCommit }: ReorderGridOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingKey, setDraggingKey] = useState<string | null>(null);
    const [indicator, setIndicator] = useState<ReorderIndicator | null>(null);
    const [ghost, setGhost] = useState<ReorderGhost | null>(null);

    const pressRef = useRef<Press | null>(null);
    const insertBeforeRef = useRef<string | null>(null);
    const longPressTimer = useRef<number | undefined>(undefined);
    const scrollerRef = useRef<HTMLElement | null>(null);
    const scrollDirection = useRef<AutoScrollDirection>(0);
    const scrollFrame = useRef<number | undefined>(undefined);
    const pointerRef = useRef<Point>({ x: 0, y: 0 });
    const latest = useRef({ keys, onCommit });
    latest.current = { keys, onCommit };

    const cellsExcept = useCallback((excludedKey: string): KeyedRect[] => {
        const nodes = containerRef.current?.querySelectorAll<HTMLElement>(`[${REORDER_KEY_ATTRIBUTE}]`) ?? [];

        return Array.from(nodes)
            .map(node => ({ key: node.getAttribute(REORDER_KEY_ATTRIBUTE) ?? '', rect: node.getBoundingClientRect() }))
            .filter(cell => cell.key !== excludedKey);
    }, []);

    const aim = useCallback(() => {
        const press = pressRef.current;
        const container = containerRef.current;
        if (!press?.armed || !container) return;
        const cells = cellsExcept(press.key);
        const insertBefore = gridInsertBefore(pointerRef.current, cells);
        insertBeforeRef.current = insertBefore;

        const origin = container.getBoundingClientRect();
        const anchor = insertBefore === null ? cells[cells.length - 1] : cells.find(cell => cell.key === insertBefore);
        if (!anchor) {
            setIndicator(null);
            return;
        }
        const edge = insertBefore === null ? anchor.rect.left + anchor.rect.width + 3 : anchor.rect.left - 5;
        setIndicator({ left: edge - origin.left, top: anchor.rect.top - origin.top, height: anchor.rect.height });
    }, [cellsExcept]);

    const stopAutoScroll = () => {
        if (scrollFrame.current !== undefined) cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = undefined;
    };

    const scrollStep = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller || scrollDirection.current === 0) {
            scrollFrame.current = undefined;
            return;
        }
        scroller.scrollTop += scrollDirection.current * AUTO_SCROLL_STEP_PX;
        aim();
        scrollFrame.current = requestAnimationFrame(scrollStep);
    }, [aim]);

    const reset = useCallback(() => {
        window.clearTimeout(longPressTimer.current);
        pressRef.current = null;
        insertBeforeRef.current = null;
        scrollDirection.current = 0;
        stopAutoScroll();
        setDraggingKey(null);
        setIndicator(null);
        setGhost(null);
        document.body.classList.remove('select-none');
    }, []);

    const arm = useCallback(
        (press: Press) => {
            press.armed = true;
            scrollerRef.current = nearestScrollParent(containerRef.current);
            document.body.classList.add('select-none');
            setDraggingKey(press.key);
            setGhost({ key: press.key, x: pointerRef.current.x - press.grab.x, y: pointerRef.current.y - press.grab.y, width: press.width, height: press.height });
            aim();
        },
        [aim],
    );

    const onPointerDown = (key: string, event: ReactPointerEvent<HTMLElement>) => {
        if (!enabled || event.button !== 0) return;
        if ((event.target as HTMLElement).closest(DRAG_BLOCKING_TARGETS)) return;
        const isTouch = event.pointerType === 'touch';
        if (isTouch && !touchEnabled) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const press: Press = {
            key,
            start: { x: event.clientX, y: event.clientY },
            grab: { x: event.clientX - rect.left, y: event.clientY - rect.top },
            width: rect.width,
            height: rect.height,
            pointerType: event.pointerType,
            armed: false,
        };
        pressRef.current = press;
        pointerRef.current = press.start;
        if (isTouch) longPressTimer.current = window.setTimeout(() => pressRef.current === press && arm(press), TOUCH_LONG_PRESS_MS);
    };

    useEffect(() => {
        const onPointerMove = (event: PointerEvent) => {
            const press = pressRef.current;
            if (!press) return;
            pointerRef.current = { x: event.clientX, y: event.clientY };
            if (!press.armed) {
                if (!passedDragThreshold(press.start, pointerRef.current)) return;
                if (press.pointerType === 'touch') {
                    reset();
                    return;
                }
                arm(press);
            }
            event.preventDefault();
            setGhost(current => (current ? { ...current, x: event.clientX - press.grab.x, y: event.clientY - press.grab.y } : current));
            aim();
            const scroller = scrollerRef.current;
            scrollDirection.current = scroller ? autoScrollDirection(scroller, event.clientY) : 0;
            if (scrollDirection.current !== 0 && scrollFrame.current === undefined) scrollFrame.current = requestAnimationFrame(scrollStep);
            if (scrollDirection.current === 0) stopAutoScroll();
        };

        const onPointerUp = () => {
            const press = pressRef.current;
            if (!press) return;
            const wasDragging = press.armed;
            const insertBefore = insertBeforeRef.current;
            reset();
            if (!wasDragging) return;

            // Thả xong trình duyệt vẫn bắn click lên ô: nuốt đúng một click đó.
            const swallowClick = (clickEvent: MouseEvent) => {
                clickEvent.stopPropagation();
                clickEvent.preventDefault();
            };
            window.addEventListener('click', swallowClick, { capture: true, once: true });
            window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);

            const { keys: currentKeys, onCommit: commit } = latest.current;
            const reordered = moveKeyBefore(currentKeys, press.key, insertBefore);
            if (reordered.join() !== currentKeys.join()) commit(reordered);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && pressRef.current?.armed) reset();
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', reset);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', reset);
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(longPressTimer.current);
            stopAutoScroll();
        };
    }, [aim, arm, reset, scrollStep]);

    return {
        containerRef,
        draggingKey,
        indicator,
        ghost,
        itemProps: (key: string) => ({
            [REORDER_KEY_ATTRIBUTE]: key,
            onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(key, event),
            onDragStart: (event: { preventDefault: () => void }) => event.preventDefault(),
        }),
    };
}
