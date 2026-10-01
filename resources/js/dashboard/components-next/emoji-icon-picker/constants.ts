// Port từ dashboard/components-next/emoji-icon-picker/constants.js
import { CURATED_ICONS } from './icons';

const ICON_BY_NAME = new Map(CURATED_ICONS.map(icon => [icon.name, icon.icon]));

// Giá trị icon là tên ascii (vd "rocket"); emoji là ký tự ngoài ascii.
export const isIconValue = (value: string): boolean =>
    typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);

// Giá trị lưu trước khi chuyển sang Lucide mang hậu tố kiểu nét ("rocket-line",
// "rocket-fill") và có khi cả tiền tố lớp của bộ Remix cũ.
export const iconNameFor = (value: string): string =>
    ICON_BY_NAME.has(value) ? value : value.replace(/^i-ri-/, '').replace(/-(line|fill)$/, '');

export const iconClassFor = (value: string): string => ICON_BY_NAME.get(iconNameFor(value)) ?? '';

export const ICON_COLORS = [
    { name: 'SLATE', value: '#64748B' },
    { name: 'RED', value: '#EF4444' },
    { name: 'ORANGE', value: '#F97316' },
    { name: 'AMBER', value: '#F59E0B' },
    { name: 'GREEN', value: '#22C55E' },
    { name: 'TEAL', value: '#14B8A6' },
    { name: 'BLUE', value: '#3B82F6' },
    { name: 'INDIGO', value: '#6366F1' },
    { name: 'VIOLET', value: '#8B5CF6' },
    { name: 'PINK', value: '#EC4899' },
];

export const DEFAULT_ICON_COLOR = '#3B82F6';

export const PICKER_MODE = {
    BOTH: 'both',
    EMOJI: 'emoji',
} as const;

export const PICKER_TAB = {
    ICONS: 'icons',
    EMOJIS: 'emojis',
} as const;

export type PickerTab = (typeof PICKER_TAB)[keyof typeof PICKER_TAB];
