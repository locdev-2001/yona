import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { t } from '../../../i18n';
import { cropPixelRect, moveCrop, normalizedCrop, resizeCrop, resizeCropAroundCenter } from './stickerEdit';
import type { CropCorner, CropSquare, ImageSize, StickerEdit } from './stickerEdit';
import { CHECKERBOARD_STYLE } from './stickerLibraryStyles';

// Vùng làm việc của trình chỉnh: công cụ Cắt hiện cả ảnh với khung cắt vuông; Đũa
// thần và Cọ phóng vùng cắt lên cho dễ chạm. Mọi toạ độ trả ra là toạ độ ảnh gốc
// chuẩn hoá 0..1. Chuột và cảm ứng đi chung Pointer Events.

export type EditorTool = 'crop' | 'wand' | 'brush';

export interface RenderedPreview {
    edit: StickerEdit;
    canvas: HTMLCanvasElement | null;
}

type Point = [number, number];

interface StickerEditStageProps {
    sourceCanvas: HTMLCanvasElement | null;
    size: ImageSize;
    crop: CropSquare;
    tool: EditorTool;
    rendered: RenderedPreview | null;
    // Bán kính cọ theo cạnh vùng cắt (0..1).
    brushRadius: number;
    canEdit: boolean;
    onCropChange: (crop: CropSquare) => void;
    onCropCommit: (before: CropSquare) => void;
    onWand: (point: Point) => void;
    onBrushStart: (point: Point) => void;
    onBrushExtend: (point: Point) => void;
}

type Gesture =
    | { kind: 'move'; startX: number; startY: number; startCrop: CropSquare }
    | { kind: 'resize'; corner: CropCorner; startCrop: CropSquare }
    | { kind: 'wand'; clientX: number; clientY: number }
    | { kind: 'brush'; last: Point };

const CROP_CORNERS: CropCorner[] = ['nw', 'ne', 'sw', 'se'];
const CORNER_POSITION: Record<CropCorner, string> = {
    nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
};
const DIM_COLOR = 'rgba(15, 23, 42, 0.55)';
const WAND_TAP_SLOP_PX = 6;
const STAGE_MAX_HEIGHT_VH = 60;
const KEYBOARD_STEP_RATIO = 0.01;
const KEYBOARD_BIG_STEP_RATIO = 0.1;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
const rendersCrop = (rendered: RenderedPreview | null, crop: CropSquare, size: ImageSize): rendered is RenderedPreview & { canvas: HTMLCanvasElement } => {
    const renderedCrop = rendered?.edit.crop;
    if (!rendered?.canvas || !renderedCrop) return false;
    const current = normalizedCrop(crop, size);
    return renderedCrop.x === current.x && renderedCrop.y === current.y && renderedCrop.w === current.w && renderedCrop.h === current.h;
};

function drawStage(
    canvas: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement,
    size: ImageSize,
    crop: CropSquare,
    tool: EditorTool,
    rendered: RenderedPreview | null,
) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const current = rendersCrop(rendered, crop, size) ? rendered : null;
    const region = current?.edit.crop ? cropPixelRect(current.edit.crop, size) : null;
    const drawCrop = (originX: number, originY: number) => {
        if (current && region) context.drawImage(current.canvas, originX + region.left - crop.left, originY + region.top - crop.top);
        else context.drawImage(sourceCanvas, crop.left, crop.top, crop.side, crop.side, originX, originY, crop.side, crop.side);
    };

    if (tool !== 'crop') {
        canvas.width = crop.side;
        canvas.height = crop.side;
        context.clearRect(0, 0, crop.side, crop.side);
        drawCrop(0, 0);
        return;
    }

    canvas.width = size.width;
    canvas.height = size.height;
    context.drawImage(sourceCanvas, 0, 0);
    context.fillStyle = DIM_COLOR;
    context.fillRect(0, 0, size.width, crop.top);
    context.fillRect(0, crop.top + crop.side, size.width, size.height - crop.top - crop.side);
    context.fillRect(0, crop.top, crop.left, crop.side);
    context.fillRect(crop.left + crop.side, crop.top, size.width - crop.left - crop.side, crop.side);
    context.clearRect(crop.left, crop.top, crop.side, crop.side);
    drawCrop(crop.left, crop.top);
}

export default function StickerEditStage({
    sourceCanvas,
    size,
    crop,
    tool,
    rendered,
    brushRadius,
    canEdit,
    onCropChange,
    onCropCommit,
    onWand,
    onBrushStart,
    onBrushExtend,
}: StickerEditStageProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gestureRef = useRef<Gesture | null>(null);
    const [brushCursor, setBrushCursor] = useState<Point | null>(null);

    useEffect(() => {
        if (canvasRef.current && sourceCanvas) drawStage(canvasRef.current, sourceCanvas, size, crop, tool, rendered);
    }, [sourceCanvas, size, crop, tool, rendered]);

    const viewport = tool === 'crop' ? { left: 0, top: 0, width: size.width, height: size.height } : { left: crop.left, top: crop.top, width: crop.side, height: crop.side };

    // Vị trí con trỏ trong khung (0..1) và toạ độ điểm ảnh tương ứng của ảnh gốc.
    const locate = (event: PointerEvent) => {
        const rect = stageRef.current!.getBoundingClientRect();
        const fractionX = rect.width > 0 ? clampUnit((event.clientX - rect.left) / rect.width) : 0;
        const fractionY = rect.height > 0 ? clampUnit((event.clientY - rect.top) / rect.height) : 0;
        const pixelX = viewport.left + fractionX * viewport.width;
        const pixelY = viewport.top + fractionY * viewport.height;

        return { fraction: [fractionX, fractionY] as Point, pixel: [pixelX, pixelY] as Point, normalized: [pixelX / size.width, pixelY / size.height] as Point };
    };

    const startGesture = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const { pixel, normalized } = locate(event);
        if (tool === 'crop') {
            const corner = (event.target as HTMLElement).closest<HTMLElement>('[data-crop-corner]')?.dataset.cropCorner as CropCorner | undefined;
            gestureRef.current = corner
                ? { kind: 'resize', corner, startCrop: crop }
                : { kind: 'move', startX: pixel[0], startY: pixel[1], startCrop: crop };
        } else if (!canEdit) {
            return;
        } else if (tool === 'wand') {
            gestureRef.current = { kind: 'wand', clientX: event.clientX, clientY: event.clientY };
        } else {
            gestureRef.current = { kind: 'brush', last: normalized };
            onBrushStart(normalized);
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    };

    const continueGesture = (event: PointerEvent<HTMLDivElement>) => {
        const { fraction, pixel, normalized } = locate(event);
        if (tool === 'brush') setBrushCursor(fraction);
        const gesture = gestureRef.current;
        if (!gesture) return;
        if (gesture.kind === 'move') {
            onCropChange(moveCrop(gesture.startCrop, pixel[0] - gesture.startX, pixel[1] - gesture.startY, size));
        } else if (gesture.kind === 'resize') {
            onCropChange(resizeCrop(gesture.startCrop, gesture.corner, pixel[0], pixel[1], size));
        } else if (gesture.kind === 'brush') {
            const minimumStep = (brushRadius * crop.side) / 4;
            const distance = Math.hypot((normalized[0] - gesture.last[0]) * size.width, (normalized[1] - gesture.last[1]) * size.height);
            if (distance < Math.max(1, minimumStep)) return;
            gesture.last = normalized;
            onBrushExtend(normalized);
        }
    };

    const endGesture = (event: PointerEvent<HTMLDivElement>) => {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (!gesture) return;
        if (gesture.kind === 'move' || gesture.kind === 'resize') {
            onCropCommit(gesture.startCrop);
        } else if (gesture.kind === 'wand' && event.type === 'pointerup') {
            const moved = Math.hypot(event.clientX - gesture.clientX, event.clientY - gesture.clientY);
            if (moved <= WAND_TAP_SLOP_PX) onWand(locate(event).normalized);
        }
    };

    const nudgeCrop = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = Math.max(1, Math.round(Math.min(size.width, size.height) * (event.shiftKey ? KEYBOARD_BIG_STEP_RATIO : KEYBOARD_STEP_RATIO)));
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        let next: CropSquare | null = null;
        if (moves[event.key]) next = moveCrop(crop, moves[event.key][0], moves[event.key][1], size);
        else if (event.key === '+' || event.key === '=') next = resizeCropAroundCenter(crop, step * 2, size);
        else if (event.key === '-') next = resizeCropAroundCenter(crop, -step * 2, size);
        if (!next) return;
        event.preventDefault();
        onCropChange(next);
        onCropCommit(crop);
    };

    const percent = (value: number, total: number) => `${(value / total) * 100}%`;
    const aspectRatio = viewport.width / viewport.height;
    const cursorClass = tool === 'crop' ? 'cursor-move' : tool === 'wand' ? 'cursor-crosshair' : 'cursor-none';

    return (
        <div
            ref={stageRef}
            role="application"
            aria-label={t('STICKER_LIBRARY.EDITOR.STAGE')}
            data-testid="sticker-edit-stage"
            className={`relative mx-auto touch-none select-none overflow-visible ${canEdit || tool === 'crop' ? cursorClass : 'cursor-not-allowed'}`}
            style={{
                ...CHECKERBOARD_STYLE,
                aspectRatio: `${viewport.width} / ${viewport.height}`,
                width: `min(100%, ${(STAGE_MAX_HEIGHT_VH * aspectRatio).toFixed(3)}vh)`,
            }}
            onPointerDown={startGesture}
            onPointerMove={continueGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onPointerLeave={() => setBrushCursor(null)}
        >
            <canvas ref={canvasRef} className="block size-full" />
            {tool === 'crop' ? (
                <div
                    tabIndex={0}
                    role="group"
                    aria-label={t('STICKER_LIBRARY.EDITOR.CROP_FRAME')}
                    data-testid="sticker-crop-frame"
                    className="absolute border-2 border-white outline outline-1 outline-slate-900 focus-visible:outline-2 focus-visible:outline-woot-500"
                    style={{
                        left: percent(crop.left, size.width),
                        top: percent(crop.top, size.height),
                        width: percent(crop.side, size.width),
                        height: percent(crop.side, size.height),
                    }}
                    onKeyDown={nudgeCrop}
                >
                    {CROP_CORNERS.map(corner => (
                        <span
                            key={corner}
                            data-crop-corner={corner}
                            aria-hidden="true"
                            className={`absolute flex size-11 items-center justify-center md:size-8 ${CORNER_POSITION[corner]}`}
                        >
                            <span className="pointer-events-none size-3.5 border-2 border-white bg-woot-500" />
                        </span>
                    ))}
                </div>
            ) : null}
            {tool === 'brush' && brushCursor ? (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white outline outline-1 outline-slate-900"
                    style={{
                        left: `${brushCursor[0] * 100}%`,
                        top: `${brushCursor[1] * 100}%`,
                        width: `${brushRadius * 200}%`,
                        aspectRatio: '1 / 1',
                    }}
                />
            ) : null}
        </div>
    );
}
