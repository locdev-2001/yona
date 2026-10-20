import { t } from '../../i18n';
import { bandIndex, bandPosition } from './avatarEditorAxes';

const SLIDER_MAX = 0.999;
const SLIDER_STEP = 0.001;

interface AvatarAxisSliderProps {
    label: string;
    // Vị trí đang dựng: giá trị đã ghim, hoặc giá trị tự suy từ tên khi chưa ghim.
    value: number;
    pinned: boolean;
    bands?: number;
    onChange: (position: number) => void;
    onTogglePin: () => void;
}

// Một trục của AvatarEditor: kéo là ghim trục đó, bấm ổ khoá để ghim/bỏ ghim giá trị đang thấy.
export default function AvatarAxisSlider({ label, value, pinned, bands, onChange, onTogglePin }: AvatarAxisSliderProps) {
    const pinLabel = t(pinned ? 'AVATAR_EDITOR.UNPIN' : 'AVATAR_EDITOR.PIN', { label });

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={pinned ? 'text-n-slate-12' : 'text-n-slate-11'}>{label}</span>
                <span className={`font-mono tabular-nums ${pinned ? 'text-n-slate-12' : 'text-n-slate-10'}`}>{value.toFixed(3)}</span>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    aria-label={label}
                    className={`flex-1 min-w-0 h-1.5 cursor-pointer ${pinned ? 'accent-n-brand' : 'accent-n-slate-9 opacity-60'}`}
                    min={0}
                    max={bands ? bands - 1 : SLIDER_MAX}
                    step={bands ? 1 : SLIDER_STEP}
                    value={bands ? bandIndex(value, bands) : value}
                    onChange={event => {
                        const raw = Number(event.target.value);
                        onChange(bands ? bandPosition(raw, bands) : raw);
                    }}
                />
                <button
                    type="button"
                    aria-pressed={pinned}
                    aria-label={pinLabel}
                    title={pinLabel}
                    className={`flex items-center justify-center size-7 rounded-lg shrink-0 transition-colors ${
                        pinned ? 'text-n-slate-12' : 'text-n-slate-10 hover:text-n-slate-12 hover:bg-n-alpha-2'
                    }`}
                    onClick={onTogglePin}
                >
                    <span className={`${pinned ? 'i-lucide-lock' : 'i-lucide-lock-open'} size-3.5`} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
