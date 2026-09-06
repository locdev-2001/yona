import { CSAT_RATINGS } from 'shared/constants/messages';

// Port từ survey/components/Rating.vue — dãy emoji của trang khảo sát công khai
// (to hơn và căn trái, khác bong bóng trong widget).
interface RatingProps {
    selectedRating?: number | null;
    isDisabled?: boolean;
    onSelectRating: (value: number) => void;
}

export default function Rating({ selectedRating = null, isDisabled = false, onSelectRating }: RatingProps) {
    return (
        <div className="customer-satisfcation mb-2">
            <div className="ratings flex py-5 px-0">
                {CSAT_RATINGS.map(rating => (
                    <button
                        key={rating.key}
                        className={[
                            'emoji-button shadow-none text-3xl lg:text-4xl outline-none mr-8',
                            rating.value === selectedRating ? 'selected' : '',
                            isDisabled ? 'disabled hover' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        onClick={() => {
                            if (!isDisabled) onSelectRating(rating.value);
                        }}
                    >
                        {rating.emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
