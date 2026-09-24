import { useEffect, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

const FALLBACK_ICON = 'i-lucide-message-circle';

interface PlatformLogoProps {
    platform: ChannelPlatform;
    className?: string;
}

/** Logo một nền tảng (kênh hoặc chính bản cài đặt). Ảnh lỗi thì lùi về icon chung, không để ô vỡ. */
export default function PlatformLogo({ platform, className = '' }: PlatformLogoProps) {
    const [hasLoadError, setLoadError] = useState(false);

    useEffect(() => setLoadError(false), [platform.logo_url]);

    if (!platform.logo_url || hasLoadError) {
        return <Icon icon={FALLBACK_ICON} className={`text-n-slate-11 ${className}`.trim()} />;
    }

    return (
        <img
            src={platform.logo_url}
            alt={platform.name}
            data-platform={platform.key}
            className={`object-contain ${className}`.trim()}
            draggable={false}
            decoding="async"
            onError={() => setLoadError(true)}
        />
    );
}
