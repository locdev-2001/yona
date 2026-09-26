import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface SegmentedOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SegmentedProps {
    options: SegmentedOption[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
    className?: string;
    size?: 'sm' | 'md';
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
    sm: 'text-label-small py-1.5 px-2.5',
    md: 'text-body-main py-2 px-3',
};

const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

// Radio group thay cho RadioCard ở những chỗ chỉ có 2-3 lựa chọn loại trừ nhau
// (kiểu launcher, vị trí…): mũi tên trái/phải/lên/xuống đổi lựa chọn như radio
// thật (roving tabindex), và mỗi ô co giãn theo nội dung — không `truncate`,
// nên nhãn dài không bao giờ bị cắt chữ.
export default function Segmented({ options, value, onChange, ariaLabel, className = '', size = 'md' }: SegmentedProps) {
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const enabledOptions = options.filter(option => !option.disabled);

    const selectAndFocus = (nextValue: string) => {
        onChange(nextValue);
        buttonRefs.current[nextValue]?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!NAVIGATION_KEYS.includes(event.key) || enabledOptions.length === 0) return;
        event.preventDefault();

        if (event.key === 'Home') {
            selectAndFocus(enabledOptions[0].value);
            return;
        }
        if (event.key === 'End') {
            selectAndFocus(enabledOptions[enabledOptions.length - 1].value);
            return;
        }

        const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        const currentIndex = enabledOptions.findIndex(option => option.value === value);
        const nextIndex = (currentIndex + direction + enabledOptions.length) % enabledOptions.length;
        selectAndFocus(enabledOptions[nextIndex].value);
    };

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={`inline-flex items-stretch gap-0.5 rounded-lg bg-n-alpha-1 outline outline-1 -outline-offset-1 outline-n-weak p-0.5 ${className}`}
        >
            {options.map(option => {
                const isSelected = option.value === value;

                return (
                    <button
                        key={option.value}
                        ref={element => {
                            buttonRefs.current[option.value] = element;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-disabled={option.disabled || undefined}
                        disabled={option.disabled}
                        tabIndex={isSelected ? 0 : -1}
                        className={`flex-1 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-1 focus-visible:ring-n-brand ${SIZE_CLASSES[size]} ${
                            isSelected
                                ? 'bg-n-solid-3 text-n-slate-12 shadow-sm'
                                : 'text-n-slate-11 hover:text-n-slate-12 disabled:opacity-40 disabled:hover:text-n-slate-11'
                        }`}
                        onClick={() => (option.disabled ? undefined : onChange(option.value))}
                        onKeyDown={handleKeyDown}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
