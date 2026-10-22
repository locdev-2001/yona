import { useId } from 'react';
import { TOUCH_HEIGHT, TOUCH_MIN_HEIGHT } from './touchTarget';

export default function VolumeControl({
    label,
    value,
    maximum = 2,
    onChange,
}: {
    label: string;
    value: number;
    maximum?: number;
    onChange: (volume: number) => void;
}) {
    const id = useId();
    return (
        <div className={`flex ${TOUCH_MIN_HEIGHT} flex-col justify-center gap-2 py-2`}>
            <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm text-n-slate-12">
                <span>{label}</span>
                <output className="text-n-slate-11 tabular-nums">{Math.round(value * 100)}%</output>
            </label>
            <input
                id={id}
                type="range"
                min={0}
                max={maximum * 100}
                step={5}
                value={Math.round(value * 100)}
                onChange={(event) => onChange(Number(event.target.value) / 100)}
                className={`${TOUCH_HEIGHT} w-full accent-n-brand`}
            />
        </div>
    );
}
