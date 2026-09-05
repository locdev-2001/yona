import { useEffect, useRef, useState } from 'react';

import './ColorPicker.scss';
import Button from 'dashboard/components-next/button/Button';
import { Chrome } from 'dashboard/components/widgets/ColorPicker';
import { colorChange } from 'dashboard/helper/colorHelper';
import type { ColorInput, PickerColor } from 'dashboard/helper/colorHelper';

// Port từ dashboard/components-next/colorpicker/ColorPicker.vue — vỏ nút
// pipette + ô màu + mã hex; phần picker dùng lại `Chrome` đã port ở B7.
interface ColorPickerProps {
    value: string;
    onChange: (hex: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
    const [isPickerOpen, setPickerOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const [colors, setColors] = useState<PickerColor>(() => colorChange(value));

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
        <div ref={rootRef} className="relative w-fit">
            <Button
                color="slate"
                icon="i-lucide-pipette"
                trailingIcon
                className="!px-3 !py-3 [&>svg]:w-4 [&>svg]:h-4"
                onClick={() => setPickerOpen(open => !open)}
            >
                <div className="flex items-center flex-grow gap-2">
                    <span className="rounded-md size-4" style={{ backgroundColor: value }} />
                    <span className="min-w-0 truncate">{value}</span>
                </div>
            </Button>
            {isPickerOpen ? (
                <Chrome
                    colors={colors}
                    wrapperClass="colorpicker-next--chrome"
                    onColorChange={handleColorChange}
                />
            ) : null}
        </div>
    );
}
