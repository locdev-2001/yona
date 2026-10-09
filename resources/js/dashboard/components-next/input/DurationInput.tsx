import { useEffect, useRef } from 'react';

import { t } from '../../../i18n';
import Input from './Input';
import { DURATION_UNITS } from './constants';
import type { DurationUnit } from './constants';

// Port từ dashboard/components-next/input/DurationInput.vue.
// Giá trị ra ngoài LUÔN tính bằng phút; đơn vị chỉ là cách hiển thị.

interface DurationInputProps {
    value: number | null;
    unit: DurationUnit;
    min?: number;
    max?: number;
    disabled?: boolean;
    className?: string;
    onChange: (value: number | null) => void;
    onUnitChange: (unit: DurationUnit) => void;
}

const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
    [DURATION_UNITS.MINUTES]: 1,
    [DURATION_UNITS.HOURS]: 60,
    [DURATION_UNITS.DAYS]: 24 * 60,
};

export default function DurationInput({
    value,
    unit,
    min = 0,
    max = Number.POSITIVE_INFINITY,
    disabled = false,
    className = '',
    onChange,
    onUnitChange,
}: DurationInputProps) {
    const previousUnit = useRef(unit);

    const toMinutes = (amount: number, forUnit: DurationUnit) => Math.floor(amount) * MINUTES_PER_UNIT[forUnit];
    const displayedValue = value === null ? '' : Math.floor(value / MINUTES_PER_UNIT[unit]);
    const clamp = (minutes: number) => Math.min(Math.max(minutes, min), max);

    // Đổi đơn vị thì làm tròn giá trị thật về mốc gần nhất của đơn vị mới, để
    // số hiển thị và số lưu không lệch nhau (watcher `unit` của bản gốc).
    useEffect(() => {
        if (previousUnit.current === unit) return;
        previousUnit.current = unit;

        if (value === null) return;
        onChange(clamp(toMinutes(value / MINUTES_PER_UNIT[unit], unit)));
    });

    const handleChange = (raw: string) => {
        if (raw === '') {
            onChange(null);

            return;
        }

        onChange(toMinutes(Number(raw), unit));
    };

    const normalize = () => {
        if (value === null) return;
        onChange(clamp(value));
    };

    return (
        <>
            <Input
                type="number"
                autoComplete="off"
                disabled={disabled}
                value={displayedValue}
                placeholder={t('DURATION_INPUT.PLACEHOLDER')}
                className={`flex-grow w-full ${className}`}
                onChange={event => handleChange(event.target.value)}
                onBlur={normalize}
                onKeyDown={event => {
                    if (event.key === 'Enter') normalize();
                }}
            />
            <select
                value={unit}
                disabled={disabled}
                className="mb-0 text-sm disabled:opacity-40"
                onChange={event => onUnitChange(event.target.value as DurationUnit)}
            >
                <option value={DURATION_UNITS.MINUTES}>{t('DURATION_INPUT.MINUTES')}</option>
                <option value={DURATION_UNITS.HOURS}>{t('DURATION_INPUT.HOURS')}</option>
                <option value={DURATION_UNITS.DAYS}>{t('DURATION_INPUT.DAYS')}</option>
            </select>
        </>
    );
}
