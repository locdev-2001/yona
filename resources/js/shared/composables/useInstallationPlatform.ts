import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../types';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

const INSTALLATION_PLATFORM_KEY = 'installation';

/** Nền tảng "chính bản cài đặt" cho badge tin gửi từ trong ứng dụng — tên và logo lấy từ cấu hình thương hiệu. */
export function useInstallationPlatform(): ChannelPlatform {
    const { globalConfig } = usePage<SharedPageProps>().props;

    return useMemo(
        () => ({
            key: INSTALLATION_PLATFORM_KEY,
            name: globalConfig.installationName,
            logo_url: globalConfig.logoThumbnail,
        }),
        [globalConfig.installationName, globalConfig.logoThumbnail],
    );
}
