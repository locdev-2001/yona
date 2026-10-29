import type { CSSProperties } from 'react';

// Bộ nền có sẵn, vẽ thuần CSS từ biến màu của portal: biến đổi giá trị ở chế độ tối
// (_dark-colors.scss) nên mỗi nền tự có biến thể sáng/tối mà không cần tệp ảnh.
// Khoá phải khớp ChatWallpaperService::PRESET_KEYS phía máy chủ.
export interface WallpaperPreset {
    key: string;
    labelKey: string;
    style: CSSProperties;
}

const color = (variable: string, alpha = 1) => `rgb(var(--${variable}) / ${alpha})`;

export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = [
    {
        key: 'mist',
        labelKey: 'CHAT_WALLPAPER.PRESETS.MIST',
        style: { backgroundColor: color('slate-2'), backgroundImage: `linear-gradient(160deg, ${color('slate-3')}, ${color('blue-3')})` },
    },
    {
        key: 'sky',
        labelKey: 'CHAT_WALLPAPER.PRESETS.SKY',
        style: { backgroundColor: color('blue-2'), backgroundImage: `linear-gradient(180deg, ${color('blue-4')}, ${color('blue-2')} 70%)` },
    },
    {
        key: 'mint',
        labelKey: 'CHAT_WALLPAPER.PRESETS.MINT',
        style: { backgroundColor: color('teal-2'), backgroundImage: `linear-gradient(150deg, ${color('teal-4')}, ${color('teal-2')} 60%, ${color('blue-3')})` },
    },
    {
        key: 'peach',
        labelKey: 'CHAT_WALLPAPER.PRESETS.PEACH',
        style: { backgroundColor: color('amber-2'), backgroundImage: `linear-gradient(160deg, ${color('amber-4')}, ${color('ruby-3')})` },
    },
    {
        key: 'lavender',
        labelKey: 'CHAT_WALLPAPER.PRESETS.LAVENDER',
        style: { backgroundColor: color('violet-2'), backgroundImage: `linear-gradient(160deg, ${color('violet-4')}, ${color('iris-3')})` },
    },
    {
        key: 'sunset',
        labelKey: 'CHAT_WALLPAPER.PRESETS.SUNSET',
        style: {
            backgroundColor: color('amber-3'),
            backgroundImage: `linear-gradient(180deg, ${color('amber-4')}, ${color('ruby-4')} 55%, ${color('violet-4')})`,
        },
    },
    {
        key: 'ocean',
        labelKey: 'CHAT_WALLPAPER.PRESETS.OCEAN',
        style: {
            backgroundColor: color('blue-3'),
            backgroundImage: `radial-gradient(circle at 15% 10%, ${color('teal-5')}, transparent 45%), radial-gradient(circle at 85% 90%, ${color('iris-5')}, transparent 50%)`,
        },
    },
    {
        key: 'dots',
        labelKey: 'CHAT_WALLPAPER.PRESETS.DOTS',
        style: {
            backgroundColor: color('slate-2'),
            backgroundImage: `radial-gradient(${color('slate-6')} 1.5px, transparent 1.5px)`,
            backgroundSize: '18px 18px',
        },
    },
    {
        key: 'grid',
        labelKey: 'CHAT_WALLPAPER.PRESETS.GRID',
        style: {
            backgroundColor: color('blue-2'),
            backgroundImage: `linear-gradient(${color('blue-5', 0.6)} 1px, transparent 1px), linear-gradient(90deg, ${color('blue-5', 0.6)} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
        },
    },
    {
        key: 'waves',
        labelKey: 'CHAT_WALLPAPER.PRESETS.WAVES',
        style: {
            backgroundColor: color('teal-2'),
            backgroundImage: `radial-gradient(circle at 50% 120%, transparent 38%, ${color('teal-4')} 39%, ${color('teal-4')} 44%, transparent 45%)`,
            backgroundSize: '48px 24px',
        },
    },
];

export function findWallpaperPreset(key: string): WallpaperPreset | undefined {
    return WALLPAPER_PRESETS.find(preset => preset.key === key);
}
