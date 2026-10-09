import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

export interface SegmentedOption {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

type SegmentedSize = 'sm' | 'md';
type SegmentedAppearance = 'default' | 'pill';

interface SegmentedProps {
    options: SegmentedOption[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
    className?: string;
    size?: SegmentedSize;
    appearance?: SegmentedAppearance;
}

const SIZE_CLASSES: Record<SegmentedSize, string> = {
    sm: 'text-label-small py-1.5 px-2.5',
    md: 'text-body-main py-2 px-3',
};

const PILL_SIZE_CLASSES: Record<SegmentedSize, string> = {
    sm: 'text-xs py-1 px-2.5 gap-1',
    md: 'text-sm py-1.5 px-4 gap-1.5',
};

// `pill`: công tắc viên thuốc, ô đang chọn tô gradient xanh phát sáng (bám ảnh mẫu
// founder duyệt cho công tắc Sáng/Tối, xem docs/ux-decisions.md). Rãnh dùng lớp phủ
// đen trong suốt nên sáng thì xám nhạt, tối thì sâu hơn nền như mẫu.
const APPEARANCE_CLASSES: Record<SegmentedAppearance, { group: string; item: string; selected: string; idle: string }> = {
    default: {
        group: 'gap-0.5 rounded-lg bg-n-surface-field p-0.5',
        item: 'rounded-md',
        selected: 'bg-n-surface-raised text-n-slate-12',
        idle: 'text-n-slate-11 hover:text-n-slate-12 disabled:opacity-40 disabled:hover:text-n-slate-11',
    },
    pill: {
        group: 'gap-1 rounded-full bg-n-alpha-black1 p-1',
        item: 'inline-flex items-center justify-center rounded-full border border-solid',
        selected:
            'border-[#5fd8ff]/70 bg-gradient-to-b from-[#12c8ff] to-[#0a7cff] text-white shadow-[0_0_14px_rgb(14_165_255/0.45)]',
        idle: 'border-transparent text-n-slate-11 hover:text-n-slate-12 disabled:opacity-40',
    },
};

const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

// Radio group thay cho RadioCard ở những chỗ chỉ có 2-3 lựa chọn loại trừ nhau
// (kiểu launcher, vị trí…): mũi tên trái/phải/lên/xuống đổi lựa chọn như radio
// thật (roving tabindex), và mỗi ô co giãn theo nội dung — không `truncate`,
// nên nhãn dài không bao giờ bị cắt chữ.
export default function Segmented({
    options,
    value,
    onChange,
    ariaLabel,
    className = '',
    size = 'md',
    appearance = 'default',
}: SegmentedProps) {
    const styles = APPEARANCE_CLASSES[appearance];
    const sizeClasses = (appearance === 'pill' ? PILL_SIZE_CLASSES : SIZE_CLASSES)[size];
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
            className={`inline-flex items-stretch ${styles.group} ${className}`}
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
                        className={`flex-1 font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-1 focus-visible:ring-n-brand ${styles.item} ${sizeClasses} ${
                            isSelected ? styles.selected : styles.idle
                        }`}
                        onClick={() => (option.disabled ? undefined : onChange(option.value))}
                        onKeyDown={handleKeyDown}
                    >
                        {option.icon ? <Icon icon={option.icon} className="size-4 shrink-0" /> : null}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
