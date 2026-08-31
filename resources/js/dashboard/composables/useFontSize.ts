import { t } from '../../i18n';

// Port từ dashboard/composables/useFontSize.js (phần logic thuần —
// state ui_settings do trang profile giữ và truyền xuống).
export const FONT_SIZE_OPTIONS = {
    SMALLER: '14px',
    SMALL: '15px',
    DEFAULT: '16px',
    LARGE: '18px',
    LARGER: '20px',
} as const;

export const DEFAULT_FONT_SIZE = FONT_SIZE_OPTIONS.DEFAULT;

export function fontSizeOptions(): { value: string; label: string }[] {
    return Object.keys(FONT_SIZE_OPTIONS).map(name => ({
        value: FONT_SIZE_OPTIONS[name as keyof typeof FONT_SIZE_OPTIONS],
        label: t(`PROFILE_SETTINGS.FORM.INTERFACE_SECTION.FONT_SIZE.OPTIONS.${name}`),
    }));
}

export function applyFontSizeToDOM(pixelValue?: string): void {
    requestAnimationFrame(() => {
        document.documentElement.style.setProperty('font-size', pixelValue ?? DEFAULT_FONT_SIZE);
    });
}
