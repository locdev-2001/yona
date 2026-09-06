import { CSAT_DISPLAY_TYPES, CSAT_RATINGS } from 'shared/constants/messages';

// Port từ settings/inbox/settingsPage/components/CSATDisplayTypeSelector.vue +
// CSATEmojiInput.vue + CSATStarInput.vue (ba file, một khối chọn kiểu hiển thị).
const SELECTED_CLASSES = 'outline-n-brand bg-n-brand/5';

const UNSELECTED_CLASSES = 'outline-n-weak bg-n-alpha-black2';

const BUTTON_CLASSES =
    'flex items-center rounded-lg transition-all duration-500 cursor-pointer outline outline-1 px-4 py-2 gap-2 min-w-56';

// CSATEmojiInput luôn tô đậm emoji "rất hài lòng" làm mẫu xem trước.
const PREVIEW_EMOJI_VALUE = 5;

interface CSATDisplayTypeSelectorProps {
    selectedType?: string;
    onUpdate: (displayType: string) => void;
}

export default function CSATDisplayTypeSelector({
    selectedType = CSAT_DISPLAY_TYPES.EMOJI,
    onUpdate,
}: CSATDisplayTypeSelectorProps) {
    return (
        <div className="flex flex-wrap gap-6 mt-2">
            <button
                className={`${BUTTON_CLASSES} ${selectedType === CSAT_DISPLAY_TYPES.EMOJI ? SELECTED_CLASSES : UNSELECTED_CLASSES}`}
                onClick={() => onUpdate(CSAT_DISPLAY_TYPES.EMOJI)}
            >
                {CSAT_RATINGS.map(rating => (
                    <div
                        key={rating.key}
                        className="rounded-full p-1 transition-transform duration-150 focus:outline-none flex items-center flex-shrink-0"
                    >
                        <span
                            className={`text-2xl ${rating.value === PREVIEW_EMOJI_VALUE ? '' : 'grayscale opacity-60'}`}
                        >
                            {rating.emoji}
                        </span>
                    </div>
                ))}
            </button>
            <button
                className={`${BUTTON_CLASSES} ${selectedType === CSAT_DISPLAY_TYPES.STAR ? SELECTED_CLASSES : UNSELECTED_CLASSES}`}
                onClick={() => onUpdate(CSAT_DISPLAY_TYPES.STAR)}
            >
                {[1, 2, 3, 4, 5].map(value => (
                    <div
                        key={`star-${value}`}
                        className="rounded-full p-1 transition-transform duration-150 focus:outline-none flex items-center flex-shrink-0"
                        aria-label={`Star ${value}`}
                    >
                        <i className="i-ri-star-fill text-n-amber-9 text-2xl" />
                    </div>
                ))}
            </button>
        </div>
    );
}
