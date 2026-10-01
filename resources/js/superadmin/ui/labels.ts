import { usePage } from '@inertiajs/react';

import type { ConsoleLabelKey, SuperAdminPageProps } from '../types';

// Chữ của khung console do máy chủ dịch sẵn (lang/{locale}/super_admin.php, nhóm
// `layout`): primitive và layout dùng được mà không kéo bộ i18n vào entry chính.
export function useConsoleLabels(): (key: ConsoleLabelKey, replacements?: Record<string, string | number>) => string {
    const labels = usePage<SuperAdminPageProps>().props.superAdmin?.labels;

    return (key, replacements = {}) =>
        Object.entries(replacements).reduce(
            (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
            labels?.[key] ?? key,
        );
}
