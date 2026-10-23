import { Slider } from '@base-ui/react/slider';
import './file-range.css';

type RangeMark = { value: number; label: string };

export function RangeField({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 5,
    marks,
    formatValue,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    marks: RangeMark[];
    formatValue: (value: number) => string;
}) {
    const tickCount = Math.round((max - min) / step);
    return (
        <Slider.Root
            className="preview-range"
            value={value}
            onValueChange={onChange}
            min={min}
            max={max}
            step={step}
            largeStep={step * 2}
            thumbAlignment="center"
        >
            <Slider.Label className="preview-range-label">{label}</Slider.Label>
            <div className="preview-range-body">
                <Slider.Control className="preview-range-control">
                    <Slider.Track className="preview-range-track">
                        <Slider.Indicator className="preview-range-indicator" />
                    </Slider.Track>
                    <Slider.Thumb
                        className="preview-range-thumb"
                        getAriaLabel={() => label}
                        getAriaValueText={(_formatted, next) => formatValue(next)}
                    >
                        <span className="preview-range-value" aria-hidden="true">
                            {formatValue(value)}
                        </span>
                    </Slider.Thumb>
                </Slider.Control>
                <div className="preview-range-ticks" aria-hidden="true">
                    {Array.from({ length: tickCount + 1 }, (_, index) => {
                        const tickValue = min + index * step;
                        return (
                            <span
                                key={tickValue}
                                data-major={marks.some((mark) => mark.value === tickValue)}
                                style={{ left: `${(index / tickCount) * 100}%` }}
                            />
                        );
                    })}
                </div>
                <div className="preview-range-marks" aria-hidden="true">
                    {marks.map((mark, index) => (
                        <span
                            key={mark.value}
                            data-edge={index === 0 ? 'start' : index === marks.length - 1 ? 'end' : undefined}
                            style={{ left: `${((mark.value - min) / (max - min)) * 100}%` }}
                        >
                            {mark.label}
                        </span>
                    ))}
                </div>
            </div>
        </Slider.Root>
    );
}
