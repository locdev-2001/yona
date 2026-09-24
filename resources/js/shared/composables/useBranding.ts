import { usePage } from '@inertiajs/react';

import { fillInstallationName } from '../../i18n';
import type { SharedPageProps } from '../../types';

// Tên bản cài đặt cho chuỗi KHÔNG đi qua t() (mô tả tích hợp do API trả, dữ liệu
// lưu trong DB); chuỗi đi qua t() đã được điền sẵn.
export function useBranding() {
    const { globalConfig } = usePage<SharedPageProps>().props;
    const installationName = globalConfig.installationName;

    const replaceInstallationName = (text: string): string => fillInstallationName(text, installationName);

    return { installationName, replaceInstallationName };
}
