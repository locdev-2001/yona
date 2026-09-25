import { t } from '../../i18n';
import { CSAT_LEVELS, csatLevelFor } from '../helpers/csatHelpers';

// Ba nút Kém / Ổn / Tuyệt của khảo sát CSAT, dùng chung cho thẻ kết thúc trong widget
// và trang khảo sát công khai. Màu lấy token khung chat (_chat-tokens.scss). Mức đang
// chọn dày viền bằng ring bên trong nên nút không đổi cỡ khi chọn.
const LEVEL_BUTTON_CLASS =
    'flex-1 min-h-11 rounded-xl border text-xs font-semibold leading-none transition-colors disabled:cursor-default';
const LEVEL_IDLE_CLASS = 'border-[var(--yona-chat-line-field)] text-[var(--yona-chat-ink-soft)]';
const LEVEL_SELECTED_CLASS =
    'border-[var(--yona-chat-accent)] ring-1 ring-inset ring-[var(--yona-chat-accent)] bg-[var(--yona-chat-accent-soft)] text-[var(--yona-chat-accent-ink)]';

interface CsatLevelPickerProps {
    // Điểm đang chọn hoặc đã lưu (thang 1–5); điểm cũ 2/4 hiện về mức gần nhất.
    rating: number | null;
    label: string;
    disabled?: boolean;
    onSelect: (rating: number) => void;
}

export default function CsatLevelPicker({ rating, label, disabled = false, onSelect }: CsatLevelPickerProps) {
    const selectedValue = rating ? csatLevelFor(rating).value : null;

    return (
        <div role="radiogroup" aria-label={label} className="flex gap-2">
            {CSAT_LEVELS.map(level => {
                const isSelected = selectedValue === level.value;

                return (
                    <button
                        key={level.key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={disabled}
                        className={`${LEVEL_BUTTON_CLASS} ${isSelected ? LEVEL_SELECTED_CLASS : LEVEL_IDLE_CLASS}`}
                        onClick={() => onSelect(level.value)}
                    >
                        {t(`WIDGET.CONVERSATION_END.${level.key}`)}
                    </button>
                );
            })}
        </div>
    );
}
