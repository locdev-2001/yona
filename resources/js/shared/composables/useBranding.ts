import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../types';

// Port từ shared/composables/useBranding.js — thay nhãn "Chatwoot" trong chuỗi
// bằng tên bản cài đặt (Yona).
export function useBranding() {
    const { globalConfig } = usePage<SharedPageProps>().props;

    const replaceInstallationName = (text: string): string =>
        text.replace(/Chatwoot/g, globalConfig.installationName);

    // Getter globalConfig/isACustomBrandedInstance (shared/store/globalConfig.js):
    // bản cài đặt đổi tên = custom branded → ẩn nội dung chỉ dành cho Chatwoot gốc.
    const isCustomBrandedInstance = globalConfig.installationName !== 'Chatwoot';

    return { replaceInstallationName, isCustomBrandedInstance };
}
