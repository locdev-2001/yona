import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { t } from '../../../i18n';
import { useStickerDisplaySize } from 'shared/sticker/stickerDisplaySize';
import { drawSquareScaled } from './stickerCanvas';
import type { StickerPreview } from './stickerEditorHooks';
import { TOGGLE_BUTTON_CLASS, TOGGLE_OFF_CLASS, TOGGLE_ON_CLASS } from './stickerLibraryStyles';
import { CHECKERBOARD_STYLE, IconButton, Spinner } from './stickerLibraryUi';

// Điều khiển dùng trong trình chỉnh ảnh: nhóm nút chọn một, thanh trượt an toàn khi vuốt, ô xem trước.

const ZOOMED_PREVIEW_PIXELS = 256;
const PAGE_STEP_RATIO = 0.1;

interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    shortcut?: string;
}

interface SegmentedControlProps<T extends string> {
    label: string;
    options: readonly SegmentedOption<T>[];
    value: T;
    disabled?: boolean;
    onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ label, options, value, disabled = false, onChange }: SegmentedControlProps<T>) {
    return (
        <div role="group" aria-label={label} className="flex min-w-0 gap-1">
            {options.map(option => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    aria-keyshortcuts={option.shortcut}
                    disabled={disabled}
                    title={option.shortcut ? `${option.label} (${option.shortcut})` : undefined}
                    onClick={() => onChange(option.value)}
                    className={`${TOGGLE_BUTTON_CLASS} ${value === option.value ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

interface StickerSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    disabled?: boolean;
    valueText?: string;
    onChange: (value: number) => void;
}

// Thanh trượt chỉ đổi giá trị khi kéo núm hoặc bấm −/+: vuốt dọc qua thanh vẫn cuộn trang, chạm lên
// track không làm nhảy giá trị (điện thoại hay vô tình chạm khi cuộn).
export function StickerSlider({ label, value, min, max, disabled = false, valueText, onChange }: StickerSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const clampValue = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
    const percent = ((value - min) / (max - min)) * 100;
    const shownValue = valueText ?? String(value);
    const change = (next: number) => {
        const clamped = clampValue(next);
        if (clamped !== value) onChange(clamped);
    };

    const valueAt = (clientX: number) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return value;

        return min + ((clientX - rect.left) / rect.width) * (max - min);
    };

    const onThumbPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
        if (disabled) return;
        isDraggingRef.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    };
    const onThumbPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
        if (isDraggingRef.current) change(valueAt(event.clientX));
    };
    const onThumbPointerUp = (event: PointerEvent<HTMLSpanElement>) => {
        isDraggingRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
        const page = Math.max(1, Math.round((max - min) * PAGE_STEP_RATIO));
        const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -page, PageUp: page };
        if (event.key === 'Home') change(min);
        else if (event.key === 'End') change(max);
        else if (steps[event.key] !== undefined) change(value + steps[event.key]);
        else return;
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div className={`flex items-center gap-1 ${disabled ? 'opacity-50' : ''}`}>
            <IconButton
                icon="i-lucide-minus"
                label={t('STICKER_LIBRARY.EDITOR.DECREASE', { label })}
                disabled={disabled || value <= min}
                onClick={() => change(value - 1)}
            />
            <div ref={trackRef} className="relative mx-2 h-11 min-w-0 flex-1 [touch-action:pan-y] md:h-9">
                <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-n-slate-4" />
                <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-n-brand" style={{ width: `${percent}%` }} />
                <span
                    role="slider"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                    aria-valuetext={shownValue}
                    aria-disabled={disabled || undefined}
                    className={`absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus-visible:outline-none md:size-8 [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-n-brand [&:focus-visible>span]:ring-offset-1 ${
                        disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                    }`}
                    style={{ left: `${percent}%` }}
                    onPointerDown={onThumbPointerDown}
                    onPointerMove={onThumbPointerMove}
                    onPointerUp={onThumbPointerUp}
                    onPointerCancel={onThumbPointerUp}
                    onKeyDown={onKeyDown}
                >
                    <span aria-hidden="true" className="size-5 rounded-full border-2 border-solid border-n-brand bg-white shadow" />
                </span>
            </div>
            <IconButton
                icon="i-lucide-plus"
                label={t('STICKER_LIBRARY.EDITOR.INCREASE', { label })}
                disabled={disabled || value >= max}
                onClick={() => change(value + 1)}
            />
            <span className="w-12 shrink-0 text-right text-sm tabular-nums text-n-slate-12" aria-hidden="true">
                {shownValue}
            </span>
        </div>
    );
}

interface StickerPreviewPairProps {
    preview: StickerPreview | null;
    frameIndex: number;
    imageSize: number;
    isRendering: boolean;
}

export function StickerPreviewPair({ preview, frameIndex, imageSize, isRendering }: StickerPreviewPairProps) {
    const displaySize = useStickerDisplaySize();
    const zoomedRef = useRef<HTMLCanvasElement>(null);
    const actualRef = useRef<HTMLCanvasElement>(null);
    const frames = preview?.squareCanvases ?? [];
    const square = frames.length > 0 ? frames[frameIndex % frames.length] : null;

    useEffect(() => {
        for (const target of [zoomedRef.current, actualRef.current]) {
            if (target) drawSquareScaled(target, preview?.isEmpty ? null : square);
        }
    }, [preview, square]);

    return (
        <section className="flex flex-col gap-2" aria-label={t('STICKER_LIBRARY.EDITOR.PREVIEW')}>
            <div className="flex h-5 items-center justify-between">
                <h4 className="m-0 text-sm font-medium text-n-slate-12">{t('STICKER_LIBRARY.EDITOR.PREVIEW')}</h4>
                {isRendering ? <Spinner size={14} /> : null}
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <figure className="m-0 flex flex-col items-center gap-1">
                    <canvas
                        ref={zoomedRef}
                        width={ZOOMED_PREVIEW_PIXELS}
                        height={ZOOMED_PREVIEW_PIXELS}
                        className="size-32 rounded-md border border-solid border-n-weak"
                        style={CHECKERBOARD_STYLE}
                        data-testid="sticker-preview-zoomed"
                    />
                    <figcaption className="text-xs text-n-slate-11">{t('STICKER_LIBRARY.EDITOR.PREVIEW_ZOOMED')}</figcaption>
                </figure>
                <figure className="m-0 flex flex-col items-center gap-1">
                    <canvas
                        ref={actualRef}
                        width={imageSize}
                        height={imageSize}
                        className="rounded-sm border border-solid border-n-weak"
                        style={{ ...CHECKERBOARD_STYLE, backgroundSize: '8px 8px', width: displaySize, height: displaySize }}
                        data-testid="sticker-preview-actual"
                    />
                    <figcaption className="text-xs text-n-slate-11">{t('STICKER_LIBRARY.EDITOR.PREVIEW_ACTUAL', { size: imageSize })}</figcaption>
                </figure>
            </div>
        </section>
    );
}
