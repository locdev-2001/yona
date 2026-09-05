import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { applyRotationTransform, calculateCenterOffset, debounce, normalizeToPercentage } from '@chatwoot/utils';

// Port từ dashboard/composables/useImageZoom.js — ref Vue thành state React,
// computed thành useMemo. Giữ nguyên hằng số và công thức gốc.
const MAX_ZOOM_LEVEL = 3;
const MIN_ZOOM_LEVEL = 1;
const ZOOM_INCREMENT = 0.2;
const MOUSE_MOVE_DEBOUNCE_MS = 100;
const MOUSE_LEAVE_DEBOUNCE_MS = 110;
const DEFAULT_IMG_TRANSFORM_ORIGIN = 'center center';

export function useImageZoom(imageRef: RefObject<HTMLImageElement | null>) {
    const [zoomScale, setZoomScale] = useState(MIN_ZOOM_LEVEL);
    const [transformOrigin, setTransformOrigin] = useState(DEFAULT_IMG_TRANSFORM_ORIGIN);
    const [activeImageRotation, setActiveImageRotation] = useState(0);

    // Debounce đọc trạng thái mới nhất qua ref (hàm debounce được tạo một lần).
    const stateRef = useRef({ zoomScale, activeImageRotation });
    stateRef.current = { zoomScale, activeImageRotation };

    const imageWrapperStyle = useMemo<CSSProperties>(
        () => ({ transform: `rotate(${activeImageRotation}deg)` }),
        [activeImageRotation],
    );

    const imageStyle = useMemo<CSSProperties>(
        () => ({
            transform: `scale(${zoomScale})`,
            cursor: zoomScale < MAX_ZOOM_LEVEL ? 'zoom-in' : 'zoom-out',
            transformOrigin,
        }),
        [zoomScale, transformOrigin],
    );

    const getZoomOrigin = useCallback(
        (x: number, y: number) => {
            const element = imageRef.current;
            if (!element) return { x: 50, y: 50 };

            const rect = element.getBoundingClientRect();
            const { relativeX, relativeY } = calculateCenterOffset(x, y, rect);
            const { rotatedX, rotatedY } = applyRotationTransform(
                relativeX,
                relativeY,
                stateRef.current.activeImageRotation,
            );

            return normalizeToPercentage(rotatedX, rotatedY, rect.width, rect.height);
        },
        [imageRef],
    );

    const onRotate = useCallback(
        (type: 'clockwise' | 'counter-clockwise') => {
            if (!imageRef.current) return;
            setTransformOrigin(DEFAULT_IMG_TRANSFORM_ORIGIN);
            setActiveImageRotation((current) => (current + (type === 'clockwise' ? 90 : -90)) % 360);
            setZoomScale(MIN_ZOOM_LEVEL);
        },
        [imageRef],
    );

    const onZoom = useCallback(
        (scale: number, x?: number, y?: number) => {
            if (!imageRef.current) return;

            const current = stateRef.current.zoomScale;
            const newScale = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, current + scale));
            if (newScale === current) return;

            if (x != null && y != null && current === MIN_ZOOM_LEVEL) {
                const { x: originX, y: originY } = getZoomOrigin(x, y);
                setTransformOrigin(`${originX}% ${originY}%`);
            }
            setZoomScale(newScale);
        },
        [imageRef, getZoomOrigin],
    );

    const onDoubleClickZoomImage = useCallback(
        (event: { preventDefault: () => void; clientX: number; clientY: number }) => {
            if (!imageRef.current) return;
            event.preventDefault();

            const newScale = stateRef.current.zoomScale >= MAX_ZOOM_LEVEL ? MIN_ZOOM_LEVEL : MAX_ZOOM_LEVEL;
            const { x: originX, y: originY } = getZoomOrigin(event.clientX, event.clientY);
            setTransformOrigin(`${originX}% ${originY}%`);
            setZoomScale(newScale);
        },
        [imageRef, getZoomOrigin],
    );

    const onWheelImageZoom = useCallback(
        (event: { preventDefault: () => void; deltaY: number; clientX: number; clientY: number }) => {
            if (!imageRef.current) return;
            event.preventDefault();
            onZoom(event.deltaY > 0 ? -ZOOM_INCREMENT : ZOOM_INCREMENT, event.clientX, event.clientY);
        },
        [imageRef, onZoom],
    );

    const onMouseMove = useMemo(
        () =>
            debounce(
                (event: { clientX: number; clientY: number }) => {
                    if (!imageRef.current) return;
                    if (stateRef.current.zoomScale !== MIN_ZOOM_LEVEL) return;

                    const { x: originX, y: originY } = getZoomOrigin(event.clientX, event.clientY);
                    setTransformOrigin(`${originX}% ${originY}%`);
                },
                MOUSE_MOVE_DEBOUNCE_MS,
                false,
            ),
        [imageRef, getZoomOrigin],
    );

    const onMouseLeave = useMemo(
        () =>
            debounce(
                () => {
                    if (!imageRef.current) return;
                    if (stateRef.current.zoomScale !== MIN_ZOOM_LEVEL) return;
                    setTransformOrigin(DEFAULT_IMG_TRANSFORM_ORIGIN);
                },
                MOUSE_LEAVE_DEBOUNCE_MS,
                false,
            ),
        [imageRef],
    );

    const resetZoomAndRotation = useCallback(() => {
        setActiveImageRotation(0);
        setZoomScale(MIN_ZOOM_LEVEL);
        setTransformOrigin(DEFAULT_IMG_TRANSFORM_ORIGIN);
    }, []);

    return {
        activeImageRotation,
        imageWrapperStyle,
        imageStyle,
        onRotate,
        onZoom,
        onDoubleClickZoomImage,
        onWheelImageZoom,
        onMouseMove,
        onMouseLeave,
        resetZoomAndRotation,
    };
}
