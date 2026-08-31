import { t } from '../../../i18n';
import { ICON_COLORS } from './constants';

// Port từ dashboard/components-next/emoji-icon-picker/ColorPalette.vue
interface ColorPaletteProps {
    value: string;
    onChange: (color: string) => void;
}

export default function ColorPalette({ value, onChange }: ColorPaletteProps) {
    return (
        <div className="flex items-center justify-between gap-1 px-0.5 mx-2 py-1 mb-px">
            {ICON_COLORS.map(color => (
                <button
                    key={color.value}
                    type="button"
                    title={t(`EMOJI_ICON_PICKER.COLORS.${color.name}`)}
                    className={`flex items-center justify-center flex-shrink-0 transition-all rounded-full size-5 ring-offset-2 ring-offset-n-surface-2 hover:ring-2 ${
                        value === color.value ? 'ring-2' : ''
                    }`}
                    style={{ backgroundColor: color.value, ['--tw-ring-color' as string]: color.value }}
                    onClick={() => onChange(color.value)}
                >
                    {value === color.value ? <span className="text-white i-lucide-check size-3" /> : null}
                </button>
            ))}
        </div>
    );
}
