import { usePage } from '@inertiajs/react';

import type { ConsoleLabelKey, SuperAdminPageProps } from '../types';

// Chữ của khung console do máy chủ dịch sẵn (lang/{locale}/admin_layout.php):
// primitive và layout dùng được mà không kéo bộ i18n vào entry chính.
export function useConsoleLabels(): (key: ConsoleLabelKey, replacements?: Record<string, string | number>) => string {
    const labels = usePage<SuperAdminPageProps>().props.superAdmin?.labels;

    return (key, replacements = {}) =>
        Object.entries(replacements).reduce(
            (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
            labels?.[key] ?? key,
        );
}

// Nhãn tiếng Việt cho tên thuộc tính/bộ lọc của bảng CRUD chung; không có thì
// dùng nhãn máy chủ gửi kèm.
export function useConsoleDictionary(): {
    attribute: (name: string, fallback: string) => string;
    filter: (name: string) => string;
} {
    const dictionary = usePage<SuperAdminPageProps>().props.superAdmin?.dictionary;

    return {
        attribute: (name, fallback) => dictionary?.attributes?.[name] ?? fallback,
        filter: name =>
            dictionary?.filters?.[name] ??
            name.charAt(0).toUpperCase() + name.slice(1).replaceAll('_', ' '),
    };
}
