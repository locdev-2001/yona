import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { t } from '../../../i18n';
import { moveCrop, normalizedCrop, resizeCrop, resizeCropAroundCenter } from './stickerEdit';
import type { CropCorner, CropSquare, ImageSize, PixelRect } from './stickerEdit';
import { useElementSize } from './stickerEditorHooks';
import type { StickerPreview } from './stickerEditorHooks';
import { CHECKERBOARD_STYLE } from './stickerLibraryUi';

// Vùng làm việc của trình chỉnh: công cụ Vùng lấy hiện cả ảnh (và phần khung thò ra ngoài ảnh) cùng
// khung vuông; Đũa thần và Cọ phóng vùng lấy lên cho dễ chạm. Luôn vừa khít chỗ trống của ô chứa,
// không cuộn. Mọi toạ độ trả ra là toạ độ ảnh gốc chuẩn hoá 0..1. Chuột và cảm ứng đi chung Pointer Events.

export type EditorTool = 'crop' | 'wand' | 'brush';

type Point = [number, number];

interface StickerEditStageProps {
    sourceCanvas: HTMLCanvasElement | null;
    size: ImageSize;
    crop: CropSquare;
    tool: EditorTool;
    preview: StickerPreview | null;
    frameIndex: number;
    // Khung bao vật của từng khung ảnh động; null với ảnh tĩnh.
    motionBounds: PixelRect | null;
    // Bán kính cọ theo cạnh vùng lấy (0..1).
    brushRadius: number;
    showBrushPreview: boolean;
    canEdit: boolean;
    // Chỗ chừa phía trên cho lớp điều khiển đè lên (điện thoại), để không che núm góc khung.
    topInsetPx?: number;
    onCropChange: (crop: CropSquare) => void;
    onCropCommit: () => void;
    onCropNudge: (crop: CropSquare) => void;
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
const MOTION_OUTLINE_COLOR = 'rgb(255, 178, 36)';
const CLIPPED_MOTION_COLOR = 'rgba(229, 72, 77, 0.45)';
const WAND_TAP_SLOP_PX = 6;
// Lề quanh ảnh ở công cụ Vùng lấy để kéo khung ra ngoài ảnh được.
const CROP_VIEW_MARGIN_RATIO = 0.12;
const STAGE_GUTTER_PX = 8;
const KEYBOARD_STEP_RATIO = 0.01;
const KEYBOARD_BIG_STEP_RATIO = 0.1;

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const unionRect = (first: PixelRect, second: PixelRect): PixelRect => {
    const left = Math.min(first.left, second.left);
    const top = Math.min(first.top, second.top);

    return {
        left,
        top,
        width: Math.max(first.left + first.width, second.left + second.width) - left,
        height: Math.max(first.top + first.height, second.top + second.height) - top,
    };
};

const cropRect = (crop: CropSquare): PixelRect => ({ left: crop.left, top: crop.top, width: crop.side, height: crop.side });

function cropViewport(size: ImageSize, crop: CropSquare): PixelRect {
    const margin = Math.round(Math.max(size.width, size.height) * CROP_VIEW_MARGIN_RATIO);
    const padded = { left: -margin, top: -margin, width: size.width + margin * 2, height: size.height + margin * 2 };

    return unionRect(padded, cropRect(crop));
}

/** Bản xem trước đang khớp đúng khung đang hiện (lúc kéo, bản dựng còn chạy theo sau). */
function previewForCrop(preview: StickerPreview | null, crop: CropSquare, size: ImageSize): StickerPreview | null {
    const rendered = preview?.edit.crop;
    if (!preview || !rendered) return null;
    const current = normalizedCrop(crop, size);

    return rendered.x === current.x && rendered.y === current.y && rendered.w === current.w && rendered.h === current.h ? preview : null;
}

interface DrawInput {
    sourceCanvas: HTMLCanvasElement;
    size: ImageSize;
    crop: CropSquare;
    tool: EditorTool;
    preview: StickerPreview | null;
    frameIndex: number;
    motionBounds: PixelRect | null;
    viewport: PixelRect;
}

function drawStage(canvas: HTMLCanvasElement, { sourceCanvas, size, crop, tool, preview, frameIndex, motionBounds, viewport }: DrawInput) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = canvas.width / viewport.width;
    const frame = cropRect(crop);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, -viewport.left * scale, -viewport.top * scale);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const current = previewForCrop(preview, crop, size);
    const regionCanvas = current ? current.regionCanvases[frameIndex % current.regionCanvases.length] : null;

    if (tool === 'crop') {
        context.drawImage(sourceCanvas, 0, 0);
        context.fillStyle = DIM_COLOR;
        context.beginPath();
        context.rect(viewport.left, viewport.top, viewport.width, viewport.height);
        context.rect(frame.left, frame.top, frame.width, frame.height);
        context.fill('evenodd');
    }
    context.clearRect(frame.left, frame.top, frame.width, frame.height);
    context.save();
    context.beginPath();
    context.rect(frame.left, frame.top, frame.width, frame.height);
    context.clip();
    if (current && regionCanvas) context.drawImage(regionCanvas, current.region.left, current.region.top);
    else context.drawImage(sourceCanvas, 0, 0);
    context.restore();

    if (motionBounds) {
        context.save();
        context.beginPath();
        context.rect(motionBounds.left, motionBounds.top, motionBounds.width, motionBounds.height);
        context.clip();
        context.beginPath();
        context.rect(motionBounds.left, motionBounds.top, motionBounds.width, motionBounds.height);
        context.rect(frame.left, frame.top, frame.width, frame.height);
        context.fillStyle = CLIPPED_MOTION_COLOR;
        context.fill('evenodd');
        context.restore();
        context.setLineDash([6 / scale, 4 / scale]);
        context.lineWidth = 2 / scale;
        context.strokeStyle = MOTION_OUTLINE_COLOR;
        context.strokeRect(motionBounds.left, motionBounds.top, motionBounds.width, motionBounds.height);
        context.setLineDash([]);
    }
}

export default function StickerEditStage({
    sourceCanvas,
    size,
    crop,
    tool,
    preview,
    frameIndex,
    motionBounds,
    brushRadius,
    showBrushPreview,
    canEdit,
    topInsetPx = 0,
    onCropChange,
    onCropCommit,
    onCropNudge,
    onWand,
    onBrushStart,
    onBrushExtend,
}: StickerEditStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gestureRef = useRef<Gesture | null>(null);
    const frozenViewportRef = useRef<PixelRect | null>(null);
    const [brushCursor, setBrushCursor] = useState<Point | null>(null);
    const available = useElementSize(containerRef);

    // Khung đang kéo làm vùng nhìn giãn ra thì giữ nguyên vùng nhìn tới khi thả tay, không nhảy dưới ngón tay.
    const viewport = tool === 'crop' ? (frozenViewportRef.current ?? cropViewport(size, crop)) : cropRect(crop);
    const aspectRatio = viewport.width / viewport.height;
    const room = { width: Math.max(0, available.width - STAGE_GUTTER_PX * 2), height: Math.max(0, available.height - STAGE_GUTTER_PX * 2) };
    const measured = room.width > 0 && room.height > 0;
    const stageWidth = measured ? Math.min(room.width, room.height * aspectRatio) : 0;
    const stageHeight = measured ? stageWidth / aspectRatio : 0;
    const pixelRatio = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sourceCanvas) return;
        const backingWidth = Math.max(1, Math.round((stageWidth || viewport.width) * pixelRatio));
        canvas.width = backingWidth;
        canvas.height = Math.max(1, Math.round(backingWidth / aspectRatio));
        drawStage(canvas, { sourceCanvas, size, crop, tool, preview, frameIndex, motionBounds, viewport });
    });

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
            frozenViewportRef.current = viewport;
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
        frozenViewportRef.current = null;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (event.pointerType !== 'mouse') setBrushCursor(null);
        if (!gesture) return;
        if (gesture.kind === 'move' || gesture.kind === 'resize') {
            onCropCommit();
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
        onCropNudge(next);
    };

    const percentX = (value: number) => `${((value - viewport.left) / viewport.width) * 100}%`;
    const percentY = (value: number) => `${((value - viewport.top) / viewport.height) * 100}%`;
    const cursorClass = tool === 'crop' ? 'cursor-move' : tool === 'wand' ? 'cursor-crosshair' : 'cursor-none';
    const brushRingStyle = { width: `${brushRadius * 200}%`, aspectRatio: '1 / 1' };

    return (
        <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ paddingTop: topInsetPx }}>
            <div
                ref={stageRef}
                role="application"
                aria-label={t('STICKER_LIBRARY.EDITOR.STAGE')}
                data-testid="sticker-edit-stage"
                className={`relative touch-none select-none ${canEdit || tool === 'crop' ? cursorClass : 'cursor-not-allowed'}`}
                style={{
                    ...CHECKERBOARD_STYLE,
                    aspectRatio: `${viewport.width} / ${viewport.height}`,
                    width: measured ? stageWidth : '100%',
                    height: measured ? stageHeight : undefined,
                }}
                onPointerDown={startGesture}
                onPointerMove={continueGesture}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onPointerLeave={event => {
                    if (event.pointerType === 'mouse') setBrushCursor(null);
                }}
            >
                <canvas ref={canvasRef} className="block size-full" />
                {tool === 'crop' ? (
                    <div
                        tabIndex={0}
                        role="group"
                        aria-label={t('STICKER_LIBRARY.EDITOR.CROP_FRAME')}
                        data-testid="sticker-crop-frame"
                        className="absolute border-2 border-solid border-white outline outline-1 outline-n-slate-12 focus-visible:outline-2 focus-visible:outline-n-brand"
                        style={{
                            left: percentX(crop.left),
                            top: percentY(crop.top),
                            width: `${(crop.side / viewport.width) * 100}%`,
                            height: `${(crop.side / viewport.height) * 100}%`,
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
                                <span className="pointer-events-none size-3.5 border-2 border-solid border-white bg-n-brand" />
                            </span>
                        ))}
                    </div>
                ) : null}
                {tool === 'brush' && brushCursor ? (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-solid border-white outline outline-1 outline-n-slate-12"
                        style={{ ...brushRingStyle, left: `${brushCursor[0] * 100}%`, top: `${brushCursor[1] * 100}%` }}
                    />
                ) : null}
                {tool === 'brush' && showBrushPreview ? (
                    <span
                        aria-hidden="true"
                        data-testid="sticker-brush-preview"
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-solid border-white bg-n-brand/20 outline outline-1 outline-n-slate-12"
                        style={brushRingStyle}
                    />
                ) : null}
            </div>
        </div>
    );
}
