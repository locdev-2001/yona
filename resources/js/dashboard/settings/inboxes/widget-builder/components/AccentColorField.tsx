import { t } from '../../../../../i18n';
import Input from 'dashboard/components-next/input/Input';
import { contrastRatioWithWhite, isLightAccent } from 'shared/helpers/accentContrast';

// 4 màu gợi ý — cùng nhóm giá trị đã dùng làm mặc định của hộp thư mới (#1f93ff)
// cộng 3 màu tương phản rõ để chọn nhanh (đen, xanh lá, cam).
const PRESET_SWATCHES = ['#1B6FCC', '#0F172A', '#0D9488', '#EA580C'];

const HEX_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

interface AccentColorFieldProps {
    value: string;
    onChange: (value: string) => void;
}

export default function AccentColorField({ value, onChange }: AccentColorFieldProps) {
    const contrastRatio = contrastRatioWithWhite(value);
    const isReadableWithWhiteText = contrastRatio !== null && !isLightAccent(value);
    const isValidHex = HEX_PATTERN.test(value.trim());

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                {PRESET_SWATCHES.map(swatch => (
                    <button
                        key={swatch}
                        type="button"
                        aria-label={swatch}
                        aria-pressed={value.toLowerCase() === swatch.toLowerCase()}
                        className={`size-8 rounded-full outline outline-2 -outline-offset-2 transition-transform ${
                            value.toLowerCase() === swatch.toLowerCase()
                                ? 'outline-n-slate-12 scale-110'
                                : 'outline-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch }}
                        onClick={() => onChange(swatch)}
                    />
                ))}
                <Input
                    aria-label={t('WIDGET_BUILDER.APPEARANCE.ACCENT_COLOR_HEX_LABEL')}
                    value={value}
                    size="sm"
                    className="w-32"
                    maxLength={7}
                    onChange={event => onChange(event.target.value)}
                />
            </div>
            {isValidHex && contrastRatio !== null ? (
                <p className={`text-label-small ${isReadableWithWhiteText ? 'text-n-teal-11' : 'text-n-amber-11'}`}>
                    {isReadableWithWhiteText
                        ? t('WIDGET_BUILDER.APPEARANCE.ACCENT_COLOR_CONTRAST_GOOD', { ratio: contrastRatio.toFixed(1) })
                        : t('WIDGET_BUILDER.APPEARANCE.ACCENT_COLOR_CONTRAST_BAD', { ratio: contrastRatio.toFixed(1) })}
                </p>
            ) : (
                <p className="text-label-small text-n-ruby-9">{t('WIDGET_BUILDER.APPEARANCE.ACCENT_COLOR_INVALID')}</p>
            )}
        </div>
    );
}
