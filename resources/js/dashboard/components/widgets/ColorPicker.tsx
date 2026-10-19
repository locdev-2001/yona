import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';

import './ColorPicker.scss';
import { colorChange, isValidHex } from 'dashboard/helper/colorHelper';
import type { ColorInput, PickerColor } from 'dashboard/helper/colorHelper';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/widgets/ColorPicker.vue + component `Chrome`
// (disable-alpha) của @lk77/vue3-color 3.0.6 — thư viện chỉ có bản Vue nên
// phần picker được viết lại bằng React, giữ nguyên DOM/class/CSS `vc-*`.
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type PointerEventLike = MouseEvent | TouchEvent;

function pagePosition(event: PointerEventLike): { pageX: number; pageY: number } {
    if ('touches' in event && event.touches.length) {
        return { pageX: event.touches[0].pageX, pageY: event.touches[0].pageY };
    }
    const mouseEvent = event as MouseEvent;

    return { pageX: mouseEvent.pageX, pageY: mouseEvent.pageY };
}

interface ChildProps {
    colors: PickerColor;
    onChange: (data: ColorInput) => void;
}

function Saturation({ colors, onChange }: ChildProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const applyRef = useRef<(event: PointerEventLike) => void>(() => {});

    applyRef.current = event => {
        const container = containerRef.current;
        if (!container) return;

        const { width, height } = { width: container.clientWidth, height: container.clientHeight };
        const bounds = container.getBoundingClientRect();
        const { pageX, pageY } = pagePosition(event);
        const left = clamp(pageX - (bounds.left + window.pageXOffset), 0, width);
        const top = clamp(pageY - (bounds.top + window.pageYOffset), 0, height);

        onChange({
            h: colors.hsv.h,
            s: left / width,
            v: clamp(-(top / height) + 1, 0, 1),
            a: colors.hsv.a,
            source: 'hsva',
        });
    };

    const startDrag = () => {
        const move = (event: MouseEvent) => {
            event.preventDefault();
            applyRef.current(event);
        };
        const stop = (event: MouseEvent) => {
            event.preventDefault();
            applyRef.current(event);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
    };

    return (
        <div
            className="vc-saturation"
            style={{ background: `hsl(${colors.hsv.h}, 100%, 50%)` }}
            ref={containerRef}
            onMouseDown={startDrag}
            onTouchMove={event => applyRef.current(event.nativeEvent)}
            onTouchStart={event => applyRef.current(event.nativeEvent)}
        >
            <div className="vc-saturation--white" />
            <div className="vc-saturation--black" />
            <div
                className="vc-saturation-pointer"
                style={{
                    top: `${-(colors.hsv.v * 100) + 1 + 100}%`,
                    left: `${colors.hsv.s * 100}%`,
                }}
            >
                <div className="vc-saturation-circle" />
            </div>
        </div>
    );
}

function Hue({ colors, onChange }: ChildProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const applyRef = useRef<(event: PointerEventLike) => void>(() => {});
    const previousHue = useRef(0);
    const pullDirection = useRef('');

    const hue = colors.hsl.h;
    if (hue !== 0 && hue - previousHue.current > 0) pullDirection.current = 'right';
    if (hue !== 0 && hue - previousHue.current < 0) pullDirection.current = 'left';
    previousHue.current = hue;

    applyRef.current = event => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const bounds = container.getBoundingClientRect();
        const { pageX } = pagePosition(event);
        const left = pageX - (bounds.left + window.pageXOffset);
        const nextHue = left < 0 ? 0 : left > width ? 360 : (360 * ((left * 100) / width)) / 100;

        if (colors.hsl.h !== nextHue) {
            onChange({ h: nextHue, s: colors.hsl.s, l: colors.hsl.l, a: colors.hsl.a, source: 'hsl' });
        }
    };

    const startDrag = (event: MouseEvent) => {
        applyRef.current(event);
        const move = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            applyRef.current(moveEvent);
        };
        const stop = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
    };

    const pointerLeft = hue === 0 && pullDirection.current === 'right' ? '100%' : `${(hue * 100) / 360}%`;

    return (
        <div className="vc-hue vc-hue--horizontal">
            <div
                className="vc-hue-container"
                role="slider"
                aria-valuenow={hue}
                aria-valuemin={0}
                aria-valuemax={360}
                ref={containerRef}
                onMouseDown={event => startDrag(event.nativeEvent)}
                onTouchMove={event => applyRef.current(event.nativeEvent)}
                onTouchStart={event => applyRef.current(event.nativeEvent)}
            >
                <div className="vc-hue-pointer" style={{ top: 0, left: pointerLeft }} role="presentation">
                    <div className="vc-hue-picker" />
                </div>
            </div>
        </div>
    );
}

interface EditableInputProps {
    label: string;
    value: string | number;
    arrowOffset?: number;
    onChange: (data: Record<string, string | number>) => void;
}

function EditableInput({ label, value, arrowOffset = 1, onChange }: EditableInputProps) {
    const labelId = `input__label__${label}__${useId()}`;
    const [draft, setDraft] = useState(String(value));
    const lastValue = useRef(value);

    if (lastValue.current !== value) {
        lastValue.current = value;
        setDraft(String(value));
    }

    const emit = (nextValue: string | number) => {
        const isHexField = label === 'hex' || label === '#';
        if (!isHexField || String(nextValue).length > 5) {
            onChange({ [label]: nextValue });
        }
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        const numeric = Number(draft);
        if (!numeric) return;

        if (event.key === 'ArrowUp') {
            emit(numeric + arrowOffset);
            event.preventDefault();
        }
        if (event.key === 'ArrowDown') {
            emit(numeric - arrowOffset);
            event.preventDefault();
        }
    };

    return (
        <div className="vc-editable-input">
            <input
                aria-labelledby={labelId}
                className="vc-input__input"
                value={draft}
                onKeyDown={handleKeyDown}
                onChange={event => {
                    setDraft(event.target.value);
                    emit(event.target.value);
                }}
            />
            <span className="vc-input__label" id={labelId}>
                {label}
            </span>
            <span className="vc-input__desc" />
        </div>
    );
}

export interface ChromeProps {
    colors: PickerColor;
    // Lớp scoped của wrapper (`colorpicker--chrome` cho bản widgets,
    // `colorpicker-next--chrome` cho bản components-next) — hai bản gốc là
    // <style scoped> nên không đè nhau, bản React phân biệt bằng lớp này.
    wrapperClass?: string;
    onColorChange: (data: ColorInput) => void;
}

export function Chrome({ colors, wrapperClass = 'colorpicker--chrome', onColorChange }: ChromeProps) {
    const [fieldsIndex, setFieldsIndex] = useState(0);
    const [highlight, setHighlight] = useState(false);

    const { r, g, b, a } = colors.rgba;
    const hsl = {
        h: colors.hsl.h.toFixed(),
        s: `${(colors.hsl.s * 100).toFixed()}%`,
        l: `${(colors.hsl.l * 100).toFixed()}%`,
    };

    const inputChange = (data: Record<string, string | number>) => {
        if (!data) return;

        if (data.hex !== undefined) {
            const hex = String(data.hex);
            if (isValidHex(hex)) onColorChange({ hex, source: 'hex' });

            return;
        }
        if (data.r !== undefined || data.g !== undefined || data.b !== undefined) {
            onColorChange({
                r: Number(data.r ?? colors.rgba.r),
                g: Number(data.g ?? colors.rgba.g),
                b: Number(data.b ?? colors.rgba.b),
                a: colors.rgba.a,
                source: 'rgba',
            });

            return;
        }
        if (data.h !== undefined || data.s !== undefined || data.l !== undefined) {
            const saturation =
                data.s !== undefined ? Number(String(data.s).replace('%', '')) / 100 : colors.hsl.s;
            const lightness =
                data.l !== undefined ? Number(String(data.l).replace('%', '')) / 100 : colors.hsl.l;

            onColorChange({
                h: Number(data.h ?? colors.hsl.h),
                s: saturation,
                l: lightness,
                source: 'hsl',
            });
        }
    };

    const fieldsStyle = (index: number): CSSProperties =>
        fieldsIndex === index ? {} : { display: 'none' };

    return (
        <div
            role="application"
            aria-label="Chrome color picker"
            className={`vc-chrome vc-chrome__disable-alpha ${wrapperClass}`}
        >
            <div className="vc-chrome-saturation-wrap">
                <Saturation colors={colors} onChange={onColorChange} />
            </div>
            <div className="vc-chrome-body">
                <div className="vc-chrome-controls">
                    <div className="vc-chrome-color-wrap">
                        <div
                            aria-label={`current color is ${colors.hex}`}
                            className="vc-chrome-active-color"
                            style={{ background: `rgba(${[r, g, b, a].join(',')})` }}
                        />
                    </div>
                    <div className="vc-chrome-sliders">
                        <div className="vc-chrome-hue-wrap">
                            <Hue colors={colors} onChange={onColorChange} />
                        </div>
                    </div>
                </div>

                <div className="vc-chrome-fields-wrap">
                    <div className="vc-chrome-fields" style={fieldsStyle(0)}>
                        <div className="vc-chrome-field">
                            <EditableInput label="hex" value={colors.hex} onChange={inputChange} />
                        </div>
                    </div>
                    <div className="vc-chrome-fields" style={fieldsStyle(1)}>
                        <div className="vc-chrome-field">
                            <EditableInput label="r" value={colors.rgba.r} onChange={inputChange} />
                        </div>
                        <div className="vc-chrome-field">
                            <EditableInput label="g" value={colors.rgba.g} onChange={inputChange} />
                        </div>
                        <div className="vc-chrome-field">
                            <EditableInput label="b" value={colors.rgba.b} onChange={inputChange} />
                        </div>
                    </div>
                    <div className="vc-chrome-fields" style={fieldsStyle(2)}>
                        <div className="vc-chrome-field">
                            <EditableInput label="h" value={hsl.h} onChange={inputChange} />
                        </div>
                        <div className="vc-chrome-field">
                            <EditableInput label="s" value={hsl.s} onChange={inputChange} />
                        </div>
                        <div className="vc-chrome-field">
                            <EditableInput label="l" value={hsl.l} onChange={inputChange} />
                        </div>
                    </div>
                    <div
                        className="vc-chrome-toggle-btn"
                        role="button"
                        aria-label="Change another color definition"
                        onClick={() => setFieldsIndex(current => (current >= 2 ? 0 : current + 1))}
                    >
                        <div className="vc-chrome-toggle-icon">
                            <span
                                className={`${ICONS.chevronsUpDown} block size-6 text-n-slate-12`}
                                aria-hidden="true"
                                onMouseOver={() => setHighlight(true)}
                                onMouseEnter={() => setHighlight(true)}
                                onMouseOut={() => setHighlight(false)}
                            />
                        </div>
                        {highlight ? <div className="vc-chrome-toggle-icon-highlight" /> : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ColorPickerProps {
    value: string;
    onChange: (hex: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
    const [isPickerOpen, setPickerOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const [colors, setColors] = useState<PickerColor>(() => colorChange(value));

    // Đồng bộ khi giá trị đến từ ngoài (mount lại form, đổi nhãn đang sửa).
    const lastValue = useRef(value);
    if (lastValue.current !== value && value.toUpperCase() !== colors.hex) {
        lastValue.current = value;
        setColors(colorChange(value));
    }

    useEffect(() => {
        if (!isPickerOpen) return undefined;

        const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setPickerOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);

        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [isPickerOpen]);

    const handleColorChange = (data: ColorInput) => {
        const next = colorChange(data, colors.hsl.h);
        lastValue.current = next.hex;
        setColors(next);
        onChange(next.hex);
    };

    return (
        <div className="colorpicker relative" ref={rootRef}>
            <div
                className="colorpicker--selected border border-solid border-n-weak rounded cursor-pointer h-8 w-8 mb-4"
                style={{ backgroundColor: value }}
                onClick={event => {
                    event.preventDefault();
                    setPickerOpen(current => !current);
                }}
            />
            {isPickerOpen ? <Chrome colors={colors} onColorChange={handleColorChange} /> : null}
        </div>
    );
}
