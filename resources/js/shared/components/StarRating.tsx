import { useState } from 'react';

// Port từ shared/components/StarRating.vue — dùng chung bong bóng CSAT trong
// widget và trang khảo sát công khai.
interface StarRatingProps {
    selectedRating?: number | null;
    isDisabled?: boolean;
    className?: string;
    onSelectRating: (value: number) => void;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

export default function StarRating({
    selectedRating = null,
    isDisabled = false,
    className = '',
    onSelectRating,
}: StarRatingProps) {
    const [hoveredRating, setHoveredRating] = useState(0);

    const starClass = (value: number) => {
        const isStarActive =
            (hoveredRating > 0 && !isDisabled && hoveredRating >= value) || (selectedRating ?? 0) >= value;

        return isStarActive ? 'i-ri-star-fill text-n-amber-9' : 'i-ri-star-line text-n-slate-10';
    };

    return (
        <div className={`flex justify-center py-5 px-4 gap-3 ${className}`.trim()}>
            {STAR_VALUES.map(value => (
                <button
                    key={value}
                    type="button"
                    className={`rounded-full p-1 transition-all duration-200 focus:enabled:scale-[1.2] focus-within:enabled:scale-[1.2] hover:enabled:scale-[1.2] focus:outline-none flex items-center flex-shrink-0 ${
                        isDisabled ? 'cursor-not-allowed opacity-50' : ''
                    }`.trim()}
                    disabled={isDisabled}
                    aria-label={`Star ${value}`}
                    onClick={() => {
                        if (!isDisabled) onSelectRating(value);
                    }}
                    onMouseEnter={() => {
                        if (!isDisabled) setHoveredRating(value);
                    }}
                    onMouseLeave={() => {
                        if (!isDisabled) setHoveredRating(0);
                    }}
                >
                    <span className={`transition-all duration-500 text-2xl ${starClass(value)}`} />
                </button>
            ))}
        </div>
    );
}
