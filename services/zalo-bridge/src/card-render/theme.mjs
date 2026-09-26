/**
 * Token màu mặc định — khớp `--mk-*` của `resources/js/shared/messaging/kit/kit.css`
 * (bản sáng). Ảnh thẻ không đọc được CSS variable của widget nên chép giá trị
 * tĩnh; `accent` là chỗ DUY NHẤT tenant tuỳ biến được (theme của kênh).
 */
export const DEFAULT_THEME = {
    accent: '#1b6fcc',
    onAccent: '#ffffff',
    ink: '#17181a',
    ink2: '#5b6068',
    ink3: '#6b7076',
    surface: '#ffffff',
    soft: '#f4f5f7',
    line: 'rgba(16, 24, 40, 0.08)',
    solid: '#17181a',
    onSolid: '#ffffff',
    onSolidSoft: 'rgba(255, 255, 255, 0.72)',
    good: '#1e7f4e',
    track: '#e3e5e8',
    media: '#eef1f6',
    sale: '#d92d20',
    saleBg: '#fee4e2',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * @param {{accent?: unknown}|null|undefined} overrides
 * @returns {typeof DEFAULT_THEME}
 */
export function resolveTheme(overrides) {
    const accent = typeof overrides?.accent === 'string' && HEX_COLOR.test(overrides.accent)
        ? overrides.accent
        : DEFAULT_THEME.accent;

    return { ...DEFAULT_THEME, accent };
}
