import { router, usePage } from '@inertiajs/react';

import { putJson } from 'dashboard/helper/apiClient';
import { t } from '../../i18n';
import type { SharedPageProps } from '../../types';

// Chế độ màu của riêng nhân viên đang đăng nhập (ui_settings.color_scheme), chỉ áp
// cho portal. Trang hồ sơ, menu avatar và Ctrl+K cùng đi qua đây để danh sách lựa
// chọn và cách lưu chỉ có một chỗ. Giá trị hợp lệ khớp App\Support\Appearance\ColorScheme;
// lần render đầu do resources/views/app.blade.php đặt class để không nháy nền.
export const COLOR_SCHEMES = ['light', 'dark'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'light';
export const COLOR_SCHEME_UI_SETTINGS_KEY = 'color_scheme';

const DARK_CLASS = 'dark';

export function normalizeColorScheme(value: unknown): ColorScheme {
    return COLOR_SCHEMES.includes(value as ColorScheme) ? (value as ColorScheme) : DEFAULT_COLOR_SCHEME;
}

export function colorSchemeOptions(): { value: ColorScheme; label: string }[] {
    return COLOR_SCHEMES.map(scheme => ({
        value: scheme,
        label: t(`PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.OPTIONS.${scheme.toUpperCase()}`),
    }));
}

export function applyColorScheme(scheme: ColorScheme): void {
    const root = document.documentElement;
    root.classList.toggle(DARK_CLASS, scheme === 'dark');
    root.style.colorScheme = scheme;
}

// Đổi ngay trên màn hình rồi mới lưu, để bấm là thấy; lưu hỏng thì trả về chế độ cũ.
// Lưu xong nạp lại `auth` để mọi chỗ đọc ui_settings thấy giá trị mới.
export async function saveColorScheme(scheme: ColorScheme, previous: ColorScheme): Promise<void> {
    applyColorScheme(scheme);
    try {
        await putJson('/api/v1/profile', { ui_settings: { [COLOR_SCHEME_UI_SETTINGS_KEY]: scheme } });
    } catch (error) {
        applyColorScheme(previous);
        throw error;
    }
    router.reload({ only: ['auth'] });
}

export function useColorScheme(): {
    colorScheme: ColorScheme;
    options: { value: ColorScheme; label: string }[];
    changeColorScheme: (scheme: ColorScheme) => Promise<void>;
} {
    const { auth } = usePage<SharedPageProps>().props;
    const colorScheme = normalizeColorScheme(auth?.user?.ui_settings?.[COLOR_SCHEME_UI_SETTINGS_KEY]);

    return {
        colorScheme,
        options: colorSchemeOptions(),
        changeColorScheme: scheme => saveColorScheme(scheme, colorScheme),
    };
}
