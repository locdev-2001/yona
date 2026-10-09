import { usePage } from '@inertiajs/react';

import { putJson } from 'dashboard/helper/apiClient';
import type { AvailableLocale, SharedPageProps } from '../../types';

// Ngôn ngữ giao diện của riêng nhân viên đang đăng nhập (ui_settings.locale);
// rỗng = theo ngôn ngữ của tài khoản. Menu avatar, Ctrl+K và trang hồ sơ cùng đi
// qua đây để danh sách ngôn ngữ và cách lưu chỉ có một chỗ.
export interface InterfaceLocale {
    availableLocales: AvailableLocale[];
    personalLocale: string;
    changeLocale: (locale: string) => Promise<void>;
}

export function useInterfaceLocale(): InterfaceLocale {
    const { auth, globalConfig } = usePage<SharedPageProps>().props;
    const personalLocale = auth?.user?.ui_settings?.locale;

    return {
        availableLocales: globalConfig?.availableLocales ?? [],
        personalLocale: typeof personalLocale === 'string' ? personalLocale : '',
        changeLocale: saveInterfaceLocale,
    };
}

// Bộ chữ nạp một lần lúc khởi động nên lưu xong phải tải lại trang để cả giao
// diện đổi ngôn ngữ.
export async function saveInterfaceLocale(locale: string): Promise<void> {
    await putJson('/api/v1/profile', { ui_settings: { locale: locale || null } });
    window.location.reload();
}
